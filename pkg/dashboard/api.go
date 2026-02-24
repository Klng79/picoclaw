package dashboard

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/sipeed/picoclaw/pkg/channels"
	"github.com/sipeed/picoclaw/pkg/config"
	"github.com/sipeed/picoclaw/pkg/logger"
	"github.com/sipeed/picoclaw/pkg/skills"
	"github.com/sipeed/picoclaw/pkg/state"
	"github.com/sipeed/picoclaw/pkg/tools"
)

var startTime = time.Now()

type API struct {
	cfgFile   string
	cfg       *config.Config
	loader    *skills.SkillsLoader
	installer *skills.SkillInstaller
	channels  *channels.Manager
	tools     *tools.ToolRegistry
	state     *state.Manager
}

func NewAPI(cfgFile string, cfg *config.Config, ch *channels.Manager, tr *tools.ToolRegistry, sm *state.Manager) *API {
	globalDir := filepath.Dir(cfgFile)
	workspace := cfg.WorkspacePath()
	return &API{
		cfgFile:   cfgFile,
		cfg:       cfg,
		loader:    skills.NewSkillsLoader(workspace, filepath.Join(globalDir, "skills"), filepath.Join(globalDir, "picoclaw", "skills")),
		installer: skills.NewSkillInstaller(workspace),
		channels:  ch,
		tools:     tr,
		state:     sm,
	}
}

func (api *API) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/system/status", api.handleSystemStatus)
	mux.HandleFunc("/api/v1/config", api.handleConfig)
	mux.HandleFunc("/api/v1/logs", api.handleLogs)
	
	// Skills endpoints
	mux.HandleFunc("/api/v1/skills/installed", api.handleInstalledSkills)
	mux.HandleFunc("GET /api/v1/skills/available", api.handleAvailableSkills)
	mux.HandleFunc("POST /api/v1/skills/install", api.handleInstallSkill)
	mux.HandleFunc("POST /api/v1/skills/uninstall", api.handleUninstallSkill)

	// Database api
	mux.HandleFunc("GET /api/v1/db/tables", api.handleGetTables)
	mux.HandleFunc("GET /api/v1/db/query", api.handleGetTableRows)
	mux.HandleFunc("DELETE /api/v1/db/row", api.handleDeleteRow)
	mux.HandleFunc("DELETE /api/v1/db/table", api.handleWipeTable)

	// Insights endpoints
	mux.HandleFunc("/api/v1/models", api.handleModels)
	mux.HandleFunc("/api/v1/channels", api.handleChannels)
	mux.HandleFunc("/api/v1/providers", api.handleProviders)
	mux.HandleFunc("/api/v1/tools", api.handleTools)

	// Serve the React matching /dashboard/
	mux.Handle("/dashboard/", http.StripPrefix("/dashboard/", http.FileServer(getStaticFS())))
	// Handle bare /dashboard with redirect
	mux.HandleFunc("/dashboard", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/dashboard/", http.StatusFound)
	})
}

// handleInstalledSkills returns local skills
func (api *API) handleInstalledSkills(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(api.loader.ListSkills())
}

// handleAvailableSkills returns skills from github
func (api *API) handleAvailableSkills(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	skills, err := api.installer.ListAvailableSkills(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(skills)
}

// handleInstallSkill installs a skill
func (api *API) handleInstallSkill(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Repository string `json:"repository"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if err := api.installer.InstallFromGitHub(r.Context(), req.Repository); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// handleUninstallSkill uninstalls a skill
func (api *API) handleUninstallSkill(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if err := api.installer.Uninstall(req.Name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (api *API) handleModels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(api.cfg.ModelList)
}

func (api *API) handleChannels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	
	status := make(map[string]any)
	if api.channels != nil {
		status = api.channels.GetStatus()
	}
	json.NewEncoder(w).Encode(status)
}

func (api *API) handleProviders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	
	// Expose non-sensitive provider configuration/status
	// For deeper status, we could check active clients, but they are instantiated ephemerally right now.
	// We'll return the config for now. Real healthchecks could be added later.
	json.NewEncoder(w).Encode(api.cfg.Providers)
}

func (api *API) handleTools(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	
	toolsList := []map[string]any{}
	if api.tools != nil {
		toolsList = api.tools.GetDefinitions()
	}
	json.NewEncoder(w).Encode(toolsList)
}

// handleLogs returns the last N lines of the log file
func (api *API) handleLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	logPath := filepath.Join(api.cfg.WorkspacePath(), "picoclaw.log")
	
	// Fast file read. On Pi, memory buffer is fine for small reads.
	// To prevent high memory on huge logs, we execute tail -n 100 which is fast and lightweight
	cmd := exec.Command("tail", "-n", "100", logPath)
	output, err := cmd.Output()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "Could not read logs"})
		return
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var parsedLogs []map[string]interface{}

	for _, line := range lines {
		if line == "" {
			continue
		}
		var logEntry map[string]interface{}
		if err := json.Unmarshal([]byte(line), &logEntry); err == nil {
			parsedLogs = append(parsedLogs, logEntry)
		} else {
			// If not JSON, attach directly (though our logger always writes JSON)
			parsedLogs = append(parsedLogs, map[string]interface{}{
				"message": line,
			})
		}
	}

	json.NewEncoder(w).Encode(parsedLogs)
}

func (api *API) handleSystemStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := GetSystemStats()
	response := map[string]interface{}{
		"uptime_seconds": time.Since(startTime).Seconds(),
		"cpu":            stats.CPUUsage,
		"ram_total":      stats.RAMTotal,
		"ram_used":       stats.RAMUsed,
		"ram_usage":      stats.RAMUsage,
		"temp":           stats.TempC,
	}

	// Add Disk Usage
	if disk, err := GetDiskUsage("/"); err == nil {
		response["disk_total"] = disk.Total
		response["disk_used"] = disk.Used
		response["disk_usage"] = disk.Usage
	}

	// Add Database Metrics
	if api.state != nil {
		response["total_messages"] = api.state.GetMessageCount()
		response["total_sessions"] = api.state.GetSessionCount()
		if info, err := os.Stat(api.state.GetDatabasePath()); err == nil {
			response["db_size_bytes"] = info.Size()
		}
	}

	// Add Metadata
	response["primary_model"] = api.cfg.Agents.Defaults.Model
	if api.channels != nil {
		response["active_channels_count"] = len(api.channels.GetEnabledChannels())
	}
	if api.tools != nil {
		response["total_tools_count"] = api.tools.Count()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (api *API) handleConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == http.MethodGet {
		// Just serve the current config from memory
		// TODO: Scrub sensitive keys if needed
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(api.cfg)
		return
	}

	if r.Method == http.MethodPost {
		var newCfg config.Config
		if err := json.NewDecoder(r.Body).Decode(&newCfg); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if err := config.SaveConfig(api.cfgFile, &newCfg); err != nil {
			logger.ErrorCF("dashboard", "Failed to save config", map[string]interface{}{"error": err.Error()})
			http.Error(w, "Failed to save configuration", http.StatusInternalServerError)
			return
		}

		// Update in-memory config
		*api.cfg = newCfg

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func (api *API) handleGetTables(w http.ResponseWriter, r *http.Request) {
	if api.state == nil {
		http.Error(w, "Database not available", http.StatusServiceUnavailable)
		return
	}

	tables := api.state.GetTables()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tables)
}

func (api *API) handleGetTableRows(w http.ResponseWriter, r *http.Request) {
	if api.state == nil {
		http.Error(w, "Database not available", http.StatusServiceUnavailable)
		return
	}

	tableName := r.URL.Query().Get("table")
	if tableName == "" {
		http.Error(w, "Missing table parameter", http.StatusBadRequest)
		return
	}

	rows, err := api.state.GetTableRows(tableName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rows)
}

func (api *API) handleDeleteRow(w http.ResponseWriter, r *http.Request) {
	if api.state == nil {
		http.Error(w, "Database not available", http.StatusServiceUnavailable)
		return
	}

	tableName := r.URL.Query().Get("table")
	idValue := r.URL.Query().Get("id")

	if tableName == "" || idValue == "" {
		http.Error(w, "Missing table or id parameters", http.StatusBadRequest)
		return
	}

	if err := api.state.DeleteRow(tableName, idValue); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (api *API) handleWipeTable(w http.ResponseWriter, r *http.Request) {
	if api.state == nil {
		http.Error(w, "Database not available", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Table string `json:"table"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Table == "" {
		http.Error(w, "Missing table parameter", http.StatusBadRequest)
		return
	}

	if err := api.state.WipeTable(req.Table); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
