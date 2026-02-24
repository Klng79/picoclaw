import { useState, useEffect } from 'react';
import { Server, Key } from 'lucide-react';

export function Providers() {
  const [providers, setProviders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const port = window.location.port === '5173' ? '18790' : window.location.port;
    const host = window.location.hostname;
    fetch(`http://${host}:${port}/api/v1/providers`)
      .then(res => res.json())
      .then(data => {
        // filter out has_providers_config
        const { has_providers_config, ...rest } = data || {};
        setProviders(rest);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="loading-state" style={{ padding: '2rem', textAlign: 'center' }}>Loading providers...</div>;

  // Filter out empty providers
  const activeProviders = Object.entries(providers).filter(([_, config]) => 
    config.api_key || config.api_base || config.auth_method
  );

  return (
    <div className="fade-in">
      <div className="header-container">
        <h2>Providers</h2>
        <p className="subtitle">Configured Legacy LLM Providers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        {activeProviders.map(([name, config]) => (
          <div key={name} className="card p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
               <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                 <Server size={24} />
               </div>
               <h3 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.25rem', fontWeight: 600 }}>{name}</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              {config.api_key && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Key size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>Configured</span>
                </div>
              )}
              {config.api_base && (
                <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Base: {config.api_base}
                </div>
              )}
              {config.auth_method && (
                 <div style={{ color: 'var(--text-muted)' }}>
                  Auth: {config.auth_method}
                </div>
              )}
            </div>
          </div>
        ))}
        {activeProviders.length === 0 && (
           <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No active legacy providers configured.</div>
        )}
      </div>
    </div>
  );
}
