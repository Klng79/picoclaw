---
description: Workaround manual workflow for utilizing Stitch MCP tools (Design & Generation) via a custom Python client, bypassing native MCP connection issues.
---
# Stitch MCP Workflow (Manual Client)

Use this workflow to interact with Google's Stitch service for generating UI/UX mockups, managing projects, and retrieving design assets. This workflow uses a local python script (`stitch_client.py`) to bypass potential MCP connection errors.

## 1. Prerequisites
- **Script Existence**: Ensure `stitch_client.py` exists in the project root.
- **Authentication**: The script uses `gcloud auth print-access-token`. Ensure you are authenticated via `gcloud auth login`.

## 2. Usage Syntax

Run the client using `python3` with the tool name and a JSON string of arguments.

```bash
python3 stitch_client.py <TOOL_NAME> '<JSON_ARGS>'
```

**⚠️ Important:** 
- Always wrap the JSON argument string in **single quotes** (`'`).
- Ensure the JSON keys and values use **double quotes** (`"`).

## 3. Common Tools & Examples

### A. List Projects
View all projects owned by the user.
```bash
python3 stitch_client.py list_projects '{"filter": "view=owned"}'
```

### B. Create Project
Create a new design container.
```bash
python3 stitch_client.py create_project '{"title": "My New App", "projectType": "TEXT_TO_UI_PRO"}'
```

### C. Generate Screen (Text-to-UI)
Generate a new mockup from a prompt. *Note: This takes time. Run in background or wait.*
```bash
python3 stitch_client.py generate_screen_from_text '{"projectId": "<PROJECT_ID>", "prompt": "<YOUR PROMPT>", "deviceType": "DESKTOP"}'
```
*Valid `deviceType`: `MOBILE`, `DESKTOP`, `TABLET`.*

### D. List Screens in Project
Find screen IDs and see what has been generated.
```bash
python3 stitch_client.py list_screens '{"projectId": "projects/<PROJECT_ID>"}'
```
*(Note: If the Project ID is numeric like `123`, the argument should usually be `projects/123` for this call, check `list_projects` output to be sure).*

### E. Get Screen Details (Download HTML)
Get the download links for screenshots and HTML code.
```bash
python3 stitch_client.py get_screen '{"projectId": "<PROJECT_ID>", "screenId": "<SCREEN_ID>"}'
```

## 4. Troubleshooting
- **"Method not supported"**: You might be using an raw RPC method. The script handles `tools/call` wrapping automatically for known tools.
- **JSON Errors**: Check your quoting. `'{"key": "value"}'` is safe.
- **Auth Errors**: Run `gcloud auth login` and `gcloud config set project <PROJECT_ID>`.