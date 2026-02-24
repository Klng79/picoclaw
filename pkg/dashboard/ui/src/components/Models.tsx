import { useState, useEffect } from 'react';
import { Cpu, Server, KeySquare } from 'lucide-react';

interface Model {
  model_name: string;
  model: string;
  api_base?: string;
  api_key?: string;
  proxy?: string;
}

export function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const port = window.location.port === '5173' ? '18790' : window.location.port;
    const host = window.location.hostname;
    fetch(`http://${host}:${port}/api/v1/models`)
      .then(res => res.json())
      .then(data => {
        setModels(data || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="loading-state" style={{ padding: '2rem', textAlign: 'center' }}>Loading models...</div>;

  return (
    <div className="fade-in">
      <div className="header-container">
        <h2>Models</h2>
        <p className="subtitle">Configured LLMs and their protocols</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        {models.map((model, i) => (
          <div key={i} className="card p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '10px', borderRadius: '12px' }}>
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{model.model_name}</h3>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{model.model}</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeySquare size={16} style={{ color: 'var(--text-muted)' }} />
                <span>API Key: {model.api_key ? '••••••••' : 'Not configured'}</span>
              </div>
              {model.api_base && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Base: {model.api_base}</span>
                </div>
              )}
               {model.proxy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Proxy: {model.proxy}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No models configured in model_list.</div>
        )}
      </div>
    </div>
  );
}
