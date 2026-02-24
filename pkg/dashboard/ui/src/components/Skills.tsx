import { useEffect, useState } from 'react';
import { Package, Download, Trash2, Box } from 'lucide-react';

interface InstalledSkill {
  name: string;
  path: string;
  source: string;
  description: string;
}

interface AvailableSkill {
  name: string;
  repository: string;
  description: string;
  author: string;
  tags: string[];
}

export function Skills() {
  const [installed, setInstalled] = useState<InstalledSkill[]>([]);
  const [available, setAvailable] = useState<AvailableSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const port = window.location.port === '5173' ? '18790' : window.location.port;
  const baseUrl = `http://${window.location.hostname}:${port}/api/v1/skills`;

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const [instRes, availRes] = await Promise.all([
        fetch(`${baseUrl}/installed`),
        fetch(`${baseUrl}/available`)
      ]);
      if (instRes.ok) setInstalled(await instRes.json());
      if (availRes.ok) setAvailable(await availRes.json());
    } catch (e) {
      console.error('Failed to fetch skills', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleInstall = async (repo: string, name: string) => {
    setActionLoading(`install-${name}`);
    try {
      await fetch(`${baseUrl}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository: repo })
      });
      await fetchSkills();
    } catch (e) {
      console.error('Failed to install', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (name: string) => {
    setActionLoading(`uninstall-${name}`);
    try {
      await fetch(`${baseUrl}/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      await fetchSkills();
    } catch (e) {
      console.error('Failed to uninstall', e);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div style={{ marginTop: '2rem' }}>Loading skills...</div>;

  const installedNames = new Set(installed.map(s => s.name));
  const trulyAvailable = available.filter(s => !installedNames.has(s.name));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '2rem' }}>
      
      {/* Installed Skills Section */}
      <section>
        <div className="topbar" style={{ marginBottom: '1.5rem' }}>
          <h2><Package size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--accent-violet)' }}/>Installed Capabilities</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{installed.length} Active</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {installed.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No capabilities installed yet.</p>
          ) : (
            installed.map(skill => (
              <div key={skill.name} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {skill.name}
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>{skill.source}</span>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.4 }}>{skill.description}</p>
                </div>
                {skill.source === 'workspace' && (
                  <button 
                    onClick={() => handleUninstall(skill.name)}
                    disabled={actionLoading === `uninstall-${skill.name}`}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Trash2 size={16} /> 
                    {actionLoading === `uninstall-${skill.name}` ? 'Removing...' : 'Uninstall'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Available Skills Section */}
      <section>
        <div className="topbar" style={{ marginBottom: '1.5rem' }}>
          <h2><Box size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--accent-cyan)' }}/>Skill Directory</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Official Picoclaw Repository</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {trulyAvailable.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>You have installed all available capabilities.</p>
          ) : (
            trulyAvailable.map(skill => (
              <div key={skill.name} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{skill.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>by @{skill.author}</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.4 }}>{skill.description}</p>
                </div>
                <button 
                  onClick={() => handleInstall(skill.repository, skill.name)}
                  disabled={actionLoading === `install-${skill.name}`}
                  style={{
                    background: 'rgba(4, 217, 255, 0.1)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(4, 217, 255, 0.2)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Download size={16} /> 
                  {actionLoading === `install-${skill.name}` ? 'Installing...' : 'Install'}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
