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
  disk_total?: number;
  disk_used?: number;
  disk_usage?: number;
  db_size_bytes?: number;
  total_messages?: number;
  total_sessions?: number;
  primary_model?: string;
  active_channels_count?: number;
  total_tools_count?: number;
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
  const getGigabytes = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(1);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

        <Gauge 
          value={stats?.disk_usage || 0} 
          label="Disk Usage" 
          color="var(--accent-cyan)" 
          unit="%"
          max={100}
        />
      </div>

      <div className="stats-grid" style={{ marginTop: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>System Summary</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Primary Model</span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{stats?.primary_model || '--'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Active Channels</span>
                    <span>{stats?.active_channels_count || 0} Enabled</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Loaded Tools</span>
                    <span>{stats?.total_tools_count || 0} Registered</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Disk Capacity</span>
                    <span>{stats?.disk_total ? `${getGigabytes(stats.disk_total)} GB` : '--'}</span>
                </div>
            </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Database & Persistence</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Database Size</span>
                    <span style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>{stats?.db_size_bytes ? formatBytes(stats.db_size_bytes) : '--'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Messages</span>
                    <span>{stats?.total_messages || 0} Msg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Stored Sessions</span>
                    <span>{stats?.total_sessions || 0} Threads</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Storage Mode</span>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>SQLite 3</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
