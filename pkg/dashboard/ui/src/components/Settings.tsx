import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

export function Settings() {
  const [config, setConfig] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const port = window.location.port === '5173' ? '18790' : window.location.port;
      const host = window.location.hostname;
      const res = await fetch(`http://${host}:${port}/api/v1/config`);
      if (res.ok) {
        setConfig(await res.json());
        setHasChanges(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      const port = window.location.port === '5173' ? '18790' : window.location.port;
      const host = window.location.hostname;
      const res = await fetch(`http://${host}:${port}/api/v1/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setHasChanges(false);
        alert('Settings saved successfully!');
      }
    } catch (e) {
      alert('Failed to save settings.');
    }
  };

  const updateConfig = (path: string[], value: any) => {
    setConfig((prev: any) => {
      const newConfig = { ...prev };
      let current = newConfig;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newConfig;
    });
    setHasChanges(true);
  };

  if (!config) return <div style={{ padding: '2rem' }}>Loading Config...</div>;

  return (
    <div>
      <div className="topbar">
        <h2>System Settings</h2>
        <button 
          className="glass-button" 
          onClick={handleSave}
          style={{ 
            display: 'flex', gap: '0.5rem', alignItems: 'center',
            boxShadow: hasChanges ? '0 0 20px rgba(140, 37, 244, 0.4)' : 'none',
            border: hasChanges ? '1px solid var(--accent-violet)' : undefined
          }}
        >
          <Save size={18} /> Save Changes
        </button>
      </div>

      <div className="main-content" style={{ padding: '2rem 0' }}>
        
        <div className="settings-section glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3>Agent Defaults</h3>
          <div className="form-group">
             <label>Primary Model</label>
             <input 
                className="glass-input" 
                value={config.agents?.defaults?.model || ''}
                onChange={(e) => updateConfig(['agents', 'defaults', 'model'], e.target.value)}
             />
          </div>
          <div className="form-group">
             <label>Max Tokens</label>
             <input 
                type="number"
                className="glass-input" 
                value={config.agents?.defaults?.max_tokens || 8192}
                onChange={(e) => updateConfig(['agents', 'defaults', 'max_tokens'], parseInt(e.target.value))}
             />
          </div>
          <div className="form-group">
            <label>Restrict to Workspace</label>
            <div className="toggle-row" onClick={() => updateConfig(['agents', 'defaults', 'restrict_to_workspace'], !config.agents?.defaults?.restrict_to_workspace)}>
              <span>Enable strict workspace boundaries</span>
              <input type="checkbox" checked={config.agents?.defaults?.restrict_to_workspace || false} readOnly />
            </div>
          </div>
        </div>

        <div className="settings-section glass-panel" style={{ padding: '2rem' }}>
          <h3>System Core</h3>
          <div className="form-group">
            <label>Persistence Type</label>
            <select 
              className="glass-input" 
              value={config.persistence?.type || 'sqlite'}
              onChange={(e) => updateConfig(['persistence', 'type'], e.target.value)}
            >
              <option value="sqlite">SQLite</option>
              <option value="json">JSON</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Gateway Port</label>
            <input 
                type="number"
                className="glass-input" 
                value={config.gateway?.port || 18790}
                onChange={(e) => updateConfig(['gateway', 'port'], parseInt(e.target.value))}
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}
