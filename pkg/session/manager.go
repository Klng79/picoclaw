package session

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/sipeed/picoclaw/pkg/config"
	"github.com/sipeed/picoclaw/pkg/providers"
	"github.com/sipeed/picoclaw/pkg/utils"
)

type Session struct {
	Key      string              `json:"key"`
	Messages []providers.Message `json:"messages"`
	Summary  string              `json:"summary,omitempty"`
	Created  time.Time           `json:"created"`
	Updated  time.Time           `json:"updated"`
}

type SessionManager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
	storage  string
	pType    config.PersistenceType
	db       *utils.DB
}

func NewSessionManager(pType config.PersistenceType, storage string) *SessionManager {
	sm := &SessionManager{
		sessions: make(map[string]*Session),
		storage:  storage,
		pType:    pType,
	}

	if pType == config.PersistenceSQLite {
		// In SQLite mode, storage path is usually the workspace dir
		// The DB is at workspace/picoclaw.db
		dbPath := filepath.Join(filepath.Dir(storage), "picoclaw.db")
		db, err := utils.InitDB(dbPath)
		if err != nil {
			log.Printf("[ERROR] session: failed to initialize sqlite database: %v. Falling back to JSON.", err)
			sm.pType = config.PersistenceJSON
		} else {
			sm.db = db
		}
	}

	if storage != "" {
		os.MkdirAll(storage, 0o755)
		jsonFound := sm.loadSessions()
		
		// If we are in SQLite mode and found JSON sessions, migrate them to DB
		if sm.pType == config.PersistenceSQLite && jsonFound {
			sm.migrateToSQLite()
		}
	}

	return sm
}

func (sm *SessionManager) GetOrCreate(key string) *Session {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	session, ok := sm.sessions[key]
	if ok {
		return session
	}

	session = &Session{
		Key:      key,
		Messages: []providers.Message{},
		Created:  time.Now(),
		Updated:  time.Now(),
	}
	sm.sessions[key] = session

	// In SQLite mode, we might want to ensure the session exists in the DB
	if sm.pType == config.PersistenceSQLite {
		sm.saveSessionMetadata(session)
	}

	return session
}

func (sm *SessionManager) AddMessage(sessionKey, role, content string) {
	sm.AddFullMessage(sessionKey, providers.Message{
		Role:    role,
		Content: content,
	})
}

// AddFullMessage adds a complete message to the session and saves it.
func (sm *SessionManager) AddFullMessage(sessionKey string, msg providers.Message) {
	sm.mu.Lock()
	session, ok := sm.sessions[sessionKey]
	if !ok {
		session = &Session{
			Key:      sessionKey,
			Messages: []providers.Message{},
			Created:  time.Now(),
		}
		sm.sessions[sessionKey] = session
	}

	session.Messages = append(session.Messages, msg)
	session.Updated = time.Now()
	sm.mu.Unlock()

	// Persistence is handled by the caller calling Save() or via internal SQLite sync
	if sm.pType == config.PersistenceSQLite {
		sm.saveSessionMetadata(session)
		sm.saveMessage(sessionKey, msg)
	}
}

func (sm *SessionManager) GetHistory(key string) []providers.Message {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	session, ok := sm.sessions[key]
	if !ok {
		return []providers.Message{}
	}

	history := make([]providers.Message, len(session.Messages))
	copy(history, session.Messages)
	return history
}

func (sm *SessionManager) GetSummary(key string) string {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	session, ok := sm.sessions[key]
	if !ok {
		return ""
	}
	return session.Summary
}

func (sm *SessionManager) SetSummary(key string, summary string) {
	sm.mu.Lock()
	session, ok := sm.sessions[key]
	if ok {
		session.Summary = summary
		session.Updated = time.Now()
	}
	sm.mu.Unlock()

	if sm.pType == config.PersistenceSQLite && ok {
		sm.saveSessionMetadata(session)
	}
}

func (sm *SessionManager) TruncateHistory(key string, keepLast int) {
	sm.mu.Lock()
	session, ok := sm.sessions[key]
	if !ok {
		sm.mu.Unlock()
		return
	}

	if keepLast <= 0 {
		session.Messages = []providers.Message{}
	} else if len(session.Messages) > keepLast {
		session.Messages = session.Messages[len(session.Messages)-keepLast:]
	} else {
		sm.mu.Unlock()
		return
	}
	session.Updated = time.Now()
	sm.mu.Unlock()

	if sm.pType == config.PersistenceSQLite {
		// For SQLite, we might just re-sync the whole message list or handle truncation specifically.
		// For simplicity in this "lite" agent, we'll re-sync the session content.
		sm.resyncMessages(key, session.Messages)
	}
}

func sanitizeFilename(key string) string {
	return strings.ReplaceAll(key, ":", "_")
}

func (sm *SessionManager) Save(key string) error {
	if sm.pType == config.PersistenceSQLite {
		// In SQLite mode, messages are saved as they are added.
		// We just need to ensure metadata is up to date if needed.
		sm.mu.RLock()
		session, ok := sm.sessions[key]
		sm.mu.RUnlock()
		if ok {
			return sm.saveSessionMetadata(session)
		}
		return nil
	}

	if sm.storage == "" {
		return nil
	}

	filename := sanitizeFilename(key)
	if filename == "." || !filepath.IsLocal(filename) || strings.ContainsAny(filename, `/\`) {
		return os.ErrInvalid
	}

	sm.mu.RLock()
	stored, ok := sm.sessions[key]
	if !ok {
		sm.mu.RUnlock()
		return nil
	}

	snapshot := Session{
		Key:      stored.Key,
		Summary:  stored.Summary,
		Created:  stored.Created,
		Updated:  stored.Updated,
		Messages: make([]providers.Message, len(stored.Messages)),
	}
	copy(snapshot.Messages, stored.Messages)
	sm.mu.RUnlock()

	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}

	sessionPath := filepath.Join(sm.storage, filename+".json")
	tmpFile, err := os.CreateTemp(sm.storage, "session-*.tmp")
	if err != nil {
		return err
	}

	tmpPath := tmpFile.Name()
	cleanup := true
	defer func() {
		if cleanup {
			_ = os.Remove(tmpPath)
		}
	}()

	if _, err := tmpFile.Write(data); err != nil {
		_ = tmpFile.Close()
		return err
	}
	if err := tmpFile.Sync(); err != nil {
		_ = tmpFile.Close()
		return err
	}
	if err := tmpFile.Close(); err != nil {
		return err
	}

	if err := os.Rename(tmpPath, sessionPath); err != nil {
		return err
	}
	cleanup = false
	return nil
}

func (sm *SessionManager) loadSessions() bool {
	jsonFound := false
	// 1. Load from JSON files first (always do this to ensure we catch files that might be added)
	files, err := os.ReadDir(sm.storage)
	if err == nil {
		for _, file := range files {
			if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
				continue
			}
			data, err := os.ReadFile(filepath.Join(sm.storage, file.Name()))
			if err != nil {
				continue
			}
			var session Session
			if err := json.Unmarshal(data, &session); err == nil {
				sm.sessions[session.Key] = &session
				jsonFound = true
			}
		}
	}

	// 2. If in SQLite mode, load from DB as well (DB takes precedence)
	if sm.pType == config.PersistenceSQLite && sm.db != nil {
		type sessionMeta struct {
			key, summary     string
			created, updated time.Time
		}
		var metas []sessionMeta

		rows, err := sm.db.Query("SELECT key, summary, created_at, updated_at FROM sessions")
		if err == nil {
			for rows.Next() {
				var m sessionMeta
				if err := rows.Scan(&m.key, &m.summary, &m.created, &m.updated); err == nil {
					metas = append(metas, m)
				}
			}
			rows.Close()

			for _, m := range metas {
				session, ok := sm.sessions[m.key]
				if !ok {
					session = &Session{Key: m.key}
					sm.sessions[m.key] = session
				}
				session.Summary = m.summary
				session.Created = m.created
				session.Updated = m.updated
				
				// Load messages for this session
				session.Messages = sm.loadMessages(m.key)
			}
		}
	}

	return jsonFound
}

func (sm *SessionManager) SetHistory(key string, history []providers.Message) {
	sm.mu.Lock()
	session, ok := sm.sessions[key]
	if ok {
		msgs := make([]providers.Message, len(history))
		copy(msgs, history)
		session.Messages = msgs
		session.Updated = time.Now()
	}
	sm.mu.Unlock()

	if sm.pType == config.PersistenceSQLite && ok {
		sm.resyncMessages(key, history)
	}
}

// SQLite helper methods

func (sm *SessionManager) saveSessionMetadata(s *Session) error {
	if sm.db == nil {
		return nil
	}
	_, err := sm.db.Exec(`
		INSERT INTO sessions (key, summary, created_at, updated_at) 
		VALUES (?, ?, ?, ?) 
		ON CONFLICT(key) DO UPDATE SET summary=excluded.summary, updated_at=excluded.updated_at
	`, s.Key, s.Summary, s.Created, s.Updated)
	return err
}

func (sm *SessionManager) saveMessage(sessionKey string, msg providers.Message) error {
	if sm.db == nil {
		return nil
	}
	contentJSON, _ := json.Marshal(msg)
	_, err := sm.db.Exec(`
		INSERT INTO messages (session_key, role, content, created_at) 
		VALUES (?, ?, ?, ?)
	`, sessionKey, msg.Role, string(contentJSON), time.Now())
	return err
}

func (sm *SessionManager) loadMessages(sessionKey string) []providers.Message {
	if sm.db == nil {
		return []providers.Message{}
	}
	rows, err := sm.db.Query("SELECT content FROM messages WHERE session_key = ? ORDER BY id ASC", sessionKey)
	if err != nil {
		return []providers.Message{}
	}
	defer rows.Close()

	var msgs []providers.Message
	for rows.Next() {
		var content string
		if err := rows.Scan(&content); err == nil {
			var msg providers.Message
			if err := json.Unmarshal([]byte(content), &msg); err == nil {
				msgs = append(msgs, msg)
			}
		}
	}
	return msgs
}

func (sm *SessionManager) resyncMessages(sessionKey string, msgs []providers.Message) error {
	if sm.db == nil {
		return nil
	}
	// Simple approach: delete and re-insert
	sm.db.Exec("DELETE FROM messages WHERE session_key = ?", sessionKey)
	for _, msg := range msgs {
		sm.saveMessage(sessionKey, msg)
	}
	return nil
}

func (sm *SessionManager) migrateToSQLite() {
	log.Printf("[INFO] session: migrating %d sessions to sqlite", len(sm.sessions))
	for key, session := range sm.sessions {
		if err := sm.saveSessionMetadata(session); err == nil {
			sm.resyncMessages(key, session.Messages)
			// Move JSON file to backup
			filename := sanitizeFilename(key)
			oldPath := filepath.Join(sm.storage, filename+".json")
			os.Rename(oldPath, oldPath+".bak")
		}
	}
}

func (sm *SessionManager) Close() error {
	if sm.db != nil {
		return sm.db.Close()
	}
	return nil
}
