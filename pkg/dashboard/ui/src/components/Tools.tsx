import { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';

export function Tools() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const port = window.location.port === '5173' ? '18790' : window.location.port;
    const host = window.location.hostname;
    fetch(`http://${host}:${port}/api/v1/tools`)
      .then(res => res.json())
      .then(data => {
        setTools(data || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="loading-state" style={{ padding: '2rem', textAlign: 'center' }}>Loading tools...</div>;

  return (
    <div className="fade-in">
      <div className="header-container">
        <h2>Tools</h2>
        <p className="subtitle">Agent capabilities and schemas</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        {tools.map((tool, i) => {
          const fn = tool.function || {};
          return (
            <div key={i} className="card p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ color: '#ec4899', display: 'flex' }}>
                  <Wrench size={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{fn.name}</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 1rem 0' }}>
                {fn.description}
              </p>
              
              <div style={{ background: '#111827', borderRadius: '8px', padding: '1rem', overflowX: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.8rem', color: '#e5e7eb', fontFamily: 'monospace' }}>
                  <code>{JSON.stringify(fn.parameters || {}, null, 2)}</code>
                </pre>
              </div>
            </div>
          );
        })}
        {tools.length === 0 && (
           <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No tools registered.</div>
        )}
      </div>
    </div>
  );
}
