import { useState, useEffect } from 'react';
import { Activity, AlertCircle } from 'lucide-react';

interface ChannelStatus {
  enabled: boolean;
  running: boolean;
}

export function Channels() {
  const [channels, setChannels] = useState<Record<string, ChannelStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const port = window.location.port === '5173' ? '18790' : window.location.port;
    const host = window.location.hostname;
    fetch(`http://${host}:${port}/api/v1/channels`)
      .then(res => res.json())
      .then(data => {
        setChannels(data || {});
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="loading-state" style={{ padding: '2rem', textAlign: 'center' }}>Loading channels...</div>;

  const entries = Object.entries(channels);

  return (
    <div className="fade-in">
      <div className="header-container">
        <h2>Channels</h2>
        <p className="subtitle">Real-time status of communication bridges</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        {entries.map(([name, status]) => (
          <div key={name} className="card p-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ background: status.running ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: status.running ? '#22c55e' : '#ef4444', padding: '12px', borderRadius: '12px', display: 'flex' }}>
              {status.running ? <Activity size={24} /> : <AlertCircle size={24} />}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.1rem', fontWeight: 600 }}>{name}</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {status.running ? 'Running' : (status.enabled ? 'Enabled (Not Running)' : 'Disabled')}
              </p>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No active channels found.</div>
        )}
      </div>
    </div>
  );
}
