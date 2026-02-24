package dashboard

import (
	"encoding/json"
	"net/http"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/sipeed/picoclaw/pkg/config"
	"github.com/sipeed/picoclaw/pkg/logger"
	"github.com/sipeed/picoclaw/pkg/skills"
)

var startTime = time.Now()

type API struct {
	cfgFile   string
	cfg       *config.Config
	loader    *skills.SkillsLoader
	installer *skills.SkillInstaller
}

func NewAPI(cfgFile string, cfg *config.Config) *API {
	globalDir := filepath.Dir(cfgFile)
	workspace := cfg.WorkspacePath()
	return &API{
		cfgFile:   cfgFile,
		cfg:       cfg,
		loader:    skills.NewSkillsLoader(workspace, filepath.Join(globalDir, "skills"), filepath.Join(globalDir, "picoclaw", "skills")),
		installer: skills.NewSkillInstaller(workspace),
	}
}

func (api *API) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/system/status", api.handleSystemStatus)
	mux.HandleFunc("/api/v1/config", api.handleConfig)
	mux.HandleFunc("/api/v1/logs", api.handleLogs)
	
	// Skills endpoints
	mux.HandleFunc("/api/v1/skills/installed", api.handleInstalledSkills)
	mux.HandleFunc("/api/v1/skills/available", api.handleAvailableSkills)
	mux.HandleFunc("/api/v1/skills/install", api.handleInstallSkill)
	mux.HandleFunc("/api/v1/skills/uninstall", api.handleUninstallSkill)

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

// ... keeping handleLogs, handleSystemStatus, handleConfig the same ...

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
