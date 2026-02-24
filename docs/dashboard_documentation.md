# PicoClaw Dashboard Documentation

## Overview
The PicoClaw Dashboard is a web-based management interface for the PicoClaw personal AI assistant. It provides a centralized view of the system status, configuration, and extensibility options.

## Dashboard Pages

### 1. Overview
![Dashboard Overview](docs/dashboard_overview.png)
The landing page of the dashboard. It displays real-time system metrics including:
- **System Stats**: Uptime, CPU Usage, RAM Usage, and Temperature.
- **Disk Usage**: Total, used, and percentage usage.
- **Database Metrics**: Total message count, session count, and database file size.
- **Metadata**: The primary AI model currently in use and the count of active channels and tools.

### 2. Channels
![Channels Page](docs/channels.png)
Displays the status of communication channels. 
- **Active Channels**: Lists channels like Telegram, indicating if they are running.
- **Connection Status**: Real-time status of the bot connections.

### 3. Models
![Models Page](docs/models.png)
Lists all available Large Language Models (LLMs) configured in the system. 
- Shows the model name, provider, and parameters.

### 4. Providers
![Providers Page](docs/providers.png)
Displays the configuration of LLM providers (e.g., Gemini, OpenAI, Claude).
- It allows verifying provider connectivity and base API URLs.

### 5. Tools
![Tools Page](docs/tools.png)
A library of all tools currently registered with the agent.
- Each tool entry includes its name, description, and the parameters it accepts.

### 6. Database
![Database Page](docs/database.png)
Allows direct interaction with the underlying SQLite database.
- **Tables**: List all tables in the system.
- **Query/View**: Browse rows within tables.
- **Maintenance**: Delete specific rows or wipe entire tables for cleanup.

### 7. Skills
![Skills Page](docs/skills.png)
The extensibility hub for PicoClaw.
- **Installed Skills**: Lists all skills currently loaded from `~/.picoclaw/workspace/skills`.
- **Installation**: Install new skills directly from GitHub repositories.
- **Management**: Uninstall skills that are no longer needed.

### 8. Settings
![Settings Page](docs/settings.png)
Advanced configuration portal.
- View and modify the `config.json` file directly from the UI.
- Update agent behavior, provider keys, and system thresholds.

### 9. Logs
![Logs Page](docs/logs.png)
A live view of the system logs.
- Displays the last 100 lines of the `picoclaw.log` file for debugging and monitoring.

## Backend API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/system/status` | GET | Returns system metrics and metadata. |
| `/api/v1/config` | GET/POST | Retrieves or updates the system configuration. |
| `/api/v1/logs` | GET | Returns the last 100 lines of system logs. |
| `/api/v1/skills/installed` | GET | Lists all installed skills. |
| `/api/v1/skills/available` | GET | Fetches available skills from the registry. |
| `/api/v1/skills/install` | POST | Triggers a skill installation from GitHub. |
| `/api/v1/skills/uninstall` | POST | Uninstalls a specific skill. |
| `/api/v1/db/tables` | GET | Lists all database tables. |
| `/api/v1/db/query` | GET | Retrieves rows from a specified table. |
| `/api/v1/db/row` | DELETE | Deletes a specific row by ID. |
| `/api/v1/db/table` | DELETE | Wipes an entire table. |
| `/api/v1/models` | GET | Lists configured AI models. |
| `/api/v1/channels` | GET | Returns channel status information. |
| `/api/v1/providers` | GET | Lists configured LLM providers. |
| `/api/v1/tools` | GET | Lists all registered tool definitions. |

## Technical Architecture
- **Backend**: Built with Go, utilizing a modular architecture for providers, channels, and tools.
- **Frontend**: A React SPA (Single Page Application) built with TypeScript and Vite, served via an embedded filesystem in the Go binary.
- **Persistence**: SQLite for message history and agent state.
- **Service Management**: Deployable via Systemd on Linux (Raspberry Pi).
