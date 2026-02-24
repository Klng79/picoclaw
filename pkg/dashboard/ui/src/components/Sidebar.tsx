
import { LayoutDashboard, Settings, ScrollText, Binary, Cpu, MessageSquare, Server, Wrench, Database, Clock } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export function Sidebar({ currentTab, setTab }: SidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'channels', label: 'Channels', icon: <MessageSquare size={20} /> },
    { id: 'models', label: 'Models', icon: <Cpu size={20} /> },
    { id: 'providers', label: 'Providers', icon: <Server size={20} /> },
    { id: 'tools', label: 'Tools', icon: <Wrench size={20} /> },
    { id: 'database', label: 'Database', icon: <Database size={20} /> },
    { id: 'skills', label: 'Skills', icon: <Binary size={20} /> },
    { id: 'cron', label: 'Cron Jobs', icon: <Clock size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
    { id: 'logs', label: 'Logs', icon: <ScrollText size={20} /> },
  ];

  return (
    <div className="sidebar">
      <div className="logo-container">
        <span className="logo-text">🦞 PicoClaw</span>
      </div>
      
      <nav>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        v1.0.0
      </div>
    </div>
  );
}
