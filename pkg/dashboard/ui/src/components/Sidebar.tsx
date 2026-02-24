
import { LayoutDashboard, Settings, ScrollText, Binary } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export function Sidebar({ currentTab, setTab }: SidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
    { id: 'logs', label: 'Logs', icon: <ScrollText size={20} /> },
    { id: 'skills', label: 'Skills', icon: <Binary size={20} /> },
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
