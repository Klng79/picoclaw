import { useEffect, useState, useRef } from 'react';

interface LogEntry {
  level?: string;
  timestamp?: string;
  component?: string;
  message?: string;
  fields?: Record<string, any>;
  caller?: string;
}

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const port = window.location.port === '5173' ? '18790' : window.location.port; // handle dev mode
        const host = window.location.hostname;
        const res = await fetch(`http://${host}:${port}/api/v1/logs`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLogLevelColor = (level?: string) => {
    switch(level) {
      case 'ERROR': return 'var(--danger)';
      case 'WARN': return '#ffb300';
      case 'DEBUG': return 'var(--text-muted)';
      case 'INFO':
      default: return 'var(--accent-cyan)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="topbar">
        <h2>Live System Logs</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Polling every 5s</div>
          <button 
            className="glass-button" 
            style={{ 
              padding: '0.4rem 0.8rem', 
              fontSize: '0.8rem',
              background: autoScroll ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
              borderColor: autoScroll ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)',
              color: autoScroll ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      <div className="glass-panel terminal-card" style={{ height: 'calc(100vh - 150px)', marginTop: '2rem', display: 'flex', flexDirection: 'column' }}>
        {logs.length === 0 ? (
           <div>Loading logs...</div>
        ) : (
           logs.map((log, i) => (
             <div key={i} style={{ marginBottom: '0.5rem', wordBreak: 'break-word' }}>
               {log.timestamp && <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>[{log.timestamp}]</span>}
               {log.level && <span style={{ color: getLogLevelColor(log.level), fontWeight: 'bold', marginRight: '0.5rem' }}>[{log.level}]</span>}
               {log.component && <span style={{ color: 'var(--accent-violet)', marginRight: '0.5rem' }}>[{log.component}]</span>}
               <span style={{ color: '#fff' }}>{log.message}</span>
               {log.fields && Object.keys(log.fields).length > 0 && (
                 <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                   {JSON.stringify(log.fields)}
                 </span>
               )}
             </div>
           ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
