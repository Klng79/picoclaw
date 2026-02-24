import { useEffect, useState } from 'react';
import { Gauge } from './Gauge';
import { ProgressBar } from './ProgressBar';

interface SystemStats {
  cpu: number;
  ram_total: number;
  ram_used: number;
  ram_usage: number;
  temp: number;
  uptime_seconds: number;
}

export function Overview() {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    // Polling every 10 seconds (Pico-weight)
    const fetchStats = async () => {
      try {
        const port = window.location.port === '5173' ? '18790' : window.location.port; // handle dev mode
        const host = window.location.hostname;
        const res = await fetch(`http://${host}:${port}/api/v1/system/status`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getMegabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(0);

  return (
    <div>
      <div className="topbar">
        <h2>Dashboard Overview</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-muted)' }}>
                Uptime: <span style={{ color: 'white', fontWeight: 600 }}>{stats ? formatUptime(stats.uptime_seconds) : '--'}</span>
            </div>
            <div style={{ padding: '0.4rem 1rem', background: 'rgba(0,230,118,0.1)', color: 'var(--success)', borderRadius: '20px', fontSize: '0.9rem', border: '1px solid rgba(0,230,118,0.2)'}}>
                Gateway Online
            </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '2rem' }}>
        <Gauge 
          value={stats?.cpu || 0} 
          label="CPU Usage" 
          color="var(--accent-cyan)" 
        />
        
        <ProgressBar
          value={stats?.ram_usage || 0}
          label="RAM Usage"
          color="var(--accent-violet)"
          subtext={stats ? `${getMegabytes(stats.ram_used)} MB / ${getMegabytes(stats.ram_total)} MB` : ''}
        />

        <Gauge 
          value={stats?.temp || 0} 
          label="Sys Temp" 
          color={stats?.temp && stats.temp > 60 ? "var(--danger)" : "var(--accent-cyan)"} 
          unit="°C"
          max={100}
        />
      </div>
      
      <h3 style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>System Logs (Recent)</h3>
      <div className="glass-panel terminal-card">
        <div>[INFO] PicoClaw Gateway started</div>
        <div>[INFO] Health endpoints available</div>
        <div>[INFO] Dashboard API available</div>
        <div style={{ color: 'var(--text-muted)' }}>Polling logs natively via API is coming soon...</div>
      </div>
    </div>
  );
}
