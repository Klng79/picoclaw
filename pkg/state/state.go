package state

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/sipeed/picoclaw/pkg/config"
	"github.com/sipeed/picoclaw/pkg/utils"
)

// State represents the persistent state for a workspace.
// It includes information about the last active channel/chat.
type State struct {
	// LastChannel is the last channel used for communication
	LastChannel string `json:"last_channel,omitempty"`

	// LastChatID is the last chat ID used for communication
	LastChatID string `json:"last_chat_id,omitempty"`

	// Timestamp is the last time this state was updated
	Timestamp time.Time `json:"timestamp"`
}

// Manager manages persistent state with atomic saves (JSON) or SQLite.
type Manager struct {
	workspace string
	state     *State
	mu        sync.RWMutex
	stateFile string
	pType     config.PersistenceType
	db        *utils.DB
}

// NewManager creates a new state manager for the given workspace and persistence type.
func NewManager(pType config.PersistenceType, workspace string) *Manager {
	stateDir := filepath.Join(workspace, "state")
	stateFile := filepath.Join(stateDir, "state.json")
	oldStateFile := filepath.Join(workspace, "state.json")

	// Create state directory if it doesn't exist
	os.MkdirAll(stateDir, 0o755)

	sm := &Manager{
		workspace: workspace,
		stateFile: stateFile,
		state:     &State{},
		pType:     pType,
	}

	if pType == config.PersistenceSQLite {
		dbPath := filepath.Join(workspace, "picoclaw.db")
		db, err := utils.InitDB(dbPath)
		if err != nil {
			log.Printf("[ERROR] state: failed to initialize sqlite database: %v. Falling back to JSON.", err)
			sm.pType = config.PersistenceJSON
		} else {
			sm.db = db
		}
	}

	// Handle migration from JSON to SQLite if necessary
	if sm.pType == config.PersistenceSQLite {
		// Try to load from state.json first to migrate
		hasJSON := false
		if _, err := os.Stat(stateFile); err == nil {
			hasJSON = true
		} else if _, err := os.Stat(oldStateFile); err == nil {
			stateFile = oldStateFile
			hasJSON = true
		}

		if hasJSON {
			if data, err := os.ReadFile(stateFile); err == nil {
				if err := json.Unmarshal(data, sm.state); err == nil {
					// Migrate to SQLite
					if err := sm.saveSQLite(); err == nil {
						log.Printf("[INFO] state: migrated state from %s to sqlite", stateFile)
						// Archive old file
						os.Rename(stateFile, stateFile+".bak")
					}
				}
			}
		}
		sm.loadSQLite() // Always load from SQLite if in SQLite mode
	} else {
		// Original JSON loading logic
		if _, err := os.Stat(stateFile); os.IsNotExist(err) {
			if data, err := os.ReadFile(oldStateFile); err == nil {
				if err := json.Unmarshal(data, sm.state); err == nil {
					sm.saveAtomic()
					log.Printf("[INFO] state: migrated state from %s to %s", oldStateFile, stateFile)
				}
			}
		} else {
			sm.load()
		}
	}

	return sm
}

// SetLastChannel updates the last channel and saves the state.
func (sm *Manager) SetLastChannel(channel string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.state.LastChannel = channel
	sm.state.Timestamp = time.Now()

	if sm.pType == config.PersistenceSQLite {
		return sm.saveSQLite()
	}
	return sm.saveAtomic()
}

// SetLastChatID updates the last chat ID and saves the state.
func (sm *Manager) SetLastChatID(chatID string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.state.LastChatID = chatID
	sm.state.Timestamp = time.Now()

	if sm.pType == config.PersistenceSQLite {
		return sm.saveSQLite()
	}
	return sm.saveAtomic()
}

// GetLastChannel returns the last channel from the state.
func (sm *Manager) GetLastChannel() string {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.state.LastChannel
}

// GetLastChatID returns the last chat ID from the state.
func (sm *Manager) GetLastChatID() string {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.state.LastChatID
}

// GetTimestamp returns the timestamp of the last state update.
func (sm *Manager) GetTimestamp() time.Time {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.state.Timestamp
}

// saveAtomic performs an atomic save using temp file + rename (JSON mode).
func (sm *Manager) saveAtomic() error {
	tempFile := sm.stateFile + ".tmp"
	data, err := json.MarshalIndent(sm.state, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}
	if err := os.WriteFile(tempFile, data, 0o644); err != nil {
		return fmt.Errorf("failed to write temp file: %w", err)
	}
	if err := os.Rename(tempFile, sm.stateFile); err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("failed to rename temp file: %w", err)
	}
	return nil
}

// saveSQLite saves the current state to the SQLite database.
func (sm *Manager) saveSQLite() error {
	if sm.db == nil {
		return fmt.Errorf("sqlite database not initialized")
	}

	_, err := sm.db.Exec(`
		INSERT INTO global_state (key, value, updated_at) 
		VALUES (?, ?, ?) 
		ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
	`, "state", serializeState(sm.state), time.Now())
	return err
}

// load loads the state from JSON.
func (sm *Manager) load() error {
	data, err := os.ReadFile(sm.stateFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to read state file: %w", err)
	}
	return json.Unmarshal(data, sm.state)
}

// loadSQLite loads the state from SQLite.
func (sm *Manager) loadSQLite() error {
	if sm.db == nil {
		return fmt.Errorf("sqlite database not initialized")
	}

	var val string
	err := sm.db.QueryRow("SELECT value FROM global_state WHERE key = ?", "state").Scan(&val)
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(val), sm.state)
}

func serializeState(s *State) string {
	data, _ := json.Marshal(s)
	return string(data)
}

func (sm *Manager) Close() error {
	if sm.db != nil {
		return sm.db.Close()
	}
	return nil
}
