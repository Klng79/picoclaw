import { useEffect, useState } from 'react';
import { Clock, Play, Trash2, Edit2, Plus, Power, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface CronSchedule {
  kind: 'at' | 'every' | 'cron';
  atMs?: number;
  everyMs?: number;
  expr?: string;
  tz?: string;
}

interface CronPayload {
  kind: string;
  message: string;
  command?: string;
  deliver: boolean;
  channel?: string;
  to?: string;
}

interface CronJobState {
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: string;
  lastError?: string;
}

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: CronSchedule;
  payload: CronPayload;
  state: CronJobState;
  createdAtMs: number;
  updatedAtMs: number;
  deleteAfterRun: boolean;
}

export function CronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<CronJob> | null>(null);
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null);

  const baseUrl = '/api/v1/cron/jobs';

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(baseUrl);
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch cron jobs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    setActionLoading(`toggle-${id}`);
    try {
      await fetch(`${baseUrl}/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled })
      });
      await fetchJobs();
    } catch (e) {
      console.error('Failed to toggle job', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTest = async (id: string) => {
    setActionLoading(`test-${id}`);
    try {
      await fetch(`${baseUrl}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setTimeout(fetchJobs, 1000);
    } catch (e) {
      console.error('Failed to test job', e);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    const id = jobToDelete.id;
    setActionLoading(`delete-${id}`);
    try {
      await fetch(`${baseUrl}?id=${id}`, {
        method: 'DELETE'
      });
      setJobToDelete(null);
      await fetchJobs();
    } catch (e) {
      console.error('Failed to delete job', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob?.name || !editingJob?.payload?.message) return;

    setActionLoading('save');
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingJob)
      });
      if (res.ok) {
        setShowModal(false);
        setEditingJob(null);
        await fetchJobs();
      }
    } catch (e) {
      console.error('Failed to save job', e);
    } finally {
      setActionLoading(null);
    }
  };

  const openAddModal = () => {
    setEditingJob({
      name: 'New Task',
      enabled: true,
      schedule: { kind: 'every', everyMs: 3600000 },
      // @ts-ignore
      payload: { kind: 'agent_turn', message: '', deliver: true, channel: 'telegram', to: typeof __APP_ENV_RECIPIENT_ID__ !== 'undefined' ? __APP_ENV_RECIPIENT_ID__ : '' },
      deleteAfterRun: false
    });
    setShowModal(true);
  };

  const openEditModal = (job: CronJob) => {
    setEditingJob(JSON.parse(JSON.stringify(job)));
    setShowModal(true);
  };

  const formatTime = (ms?: number) => {
    if (!ms) return 'Never';
    return new Date(ms).toLocaleString();
  };

  const formatSchedule = (s: CronSchedule) => {
    if (s.kind === 'every') return `Every ${s.everyMs! / 1000}s`;
    if (s.kind === 'cron') return `Cron: ${s.expr}`;
    if (s.kind === 'at') return `Once at ${formatTime(s.atMs)}`;
    return 'Unknown';
  };

  if (loading && jobs.length === 0) return <div style={{ marginTop: '2rem' }}>Loading scheduled tasks...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      <div className="topbar">
        <div>
          <h2><Clock size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--accent-violet)' }}/>Cron Jobs</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{jobs.filter(j => j.enabled).length} Active / {jobs.length} Total</div>
        </div>
        <button type="button" className="premium-button primary" onClick={openAddModal}>
          <Plus size={18} /> New Job
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {jobs.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No scheduled tasks found.</p>
            <button className="premium-button" onClick={openAddModal} style={{ marginTop: '1rem' }}>Create your first job</button>
          </div>
        ) : (
          jobs.sort((a, b) => b.createdAtMs - a.createdAtMs).map(job => (
            <div key={job.id} className={`glass-panel job-card ${!job.enabled ? 'disabled' : ''}`} style={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 200px 200px 180px', 
              alignItems: 'center',
              gap: '1rem',
              padding: '1.2rem 1.5rem',
              opacity: job.enabled ? 1 : 0.6,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <div 
                onClick={() => handleToggle(job.id, !job.enabled)}
                style={{ 
                  cursor: 'pointer', 
                  color: job.enabled ? 'var(--success)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Power size={22} className={actionLoading === `toggle-${job.id}` ? 'spin' : ''} />
              </div>
              
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{job.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {formatSchedule(job.schedule)} • {job.payload.message.substring(0, 40)}{job.payload.message.length > 40 ? '...' : ''}
                </div>
                {job.payload.command && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                    {'>'} {job.payload.command}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Next Run</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-subtle)' }}>{job.enabled ? formatTime(job.state.nextRunAtMs) : 'Paused'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Last Run</div>
                <div style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-subtle)' }}>
                  {job.state.lastStatus === 'ok' && <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
                  {job.state.lastStatus === 'error' && <AlertCircle size={14} style={{ color: 'var(--danger)' }} />}
                  {job.state.lastRunAtMs ? formatTime(job.state.lastRunAtMs) : 'N/A'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button 
                  type="button"
                  className="premium-icon-button test" 
                  title="Run now" 
                  onClick={() => handleTest(job.id)}
                  disabled={actionLoading === `test-${job.id}` || !job.enabled}
                >
                  <Play size={16} />
                </button>
                <button type="button" className="premium-icon-button edit" title="Edit" onClick={() => openEditModal(job)}>
                  <Edit2 size={16} />
                </button>
                <button 
                  type="button"
                  className="premium-icon-button delete" 
                  title="Delete" 
                  onClick={() => setJobToDelete(job)}
                  disabled={actionLoading === `delete-${job.id}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && editingJob && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ width: '550px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingJob.id ? 'Edit Cron Job' : 'New Cron Job'}</h2>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="input-label">Task Name</label>
                <input 
                  type="text" 
                  value={editingJob.name} 
                  onChange={e => setEditingJob({...editingJob, name: e.target.value})}
                  placeholder="e.g. Daily Market Summary"
                  className="premium-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label className="input-label">Schedule Type</label>
                  <select 
                    value={editingJob.schedule?.kind} 
                    onChange={e => setEditingJob({...editingJob, schedule: {...editingJob.schedule!, kind: e.target.value as any}})}
                    className="premium-input"
                  >
                    <option value="every">Interval</option>
                    <option value="cron">Cron Expression</option>
                    <option value="at">One-time</option>
                  </select>
                </div>
                <div>
                  {editingJob.schedule?.kind === 'every' && (
                    <>
                      <label className="input-label">Interval (ms)</label>
                      <input 
                        type="number" 
                        value={editingJob.schedule.everyMs} 
                        onChange={e => setEditingJob({...editingJob, schedule: {...editingJob.schedule!, everyMs: parseInt(e.target.value)}})}
                        className="premium-input"
                      />
                    </>
                  )}
                  {editingJob.schedule?.kind === 'cron' && (
                    <>
                      <label className="input-label">Cron Expression</label>
                      <input 
                        type="text" 
                        value={editingJob.schedule.expr} 
                        onChange={e => setEditingJob({...editingJob, schedule: {...editingJob.schedule!, expr: e.target.value}})}
                        placeholder="0 0 * * *"
                        className="premium-input"
                      />
                    </>
                  )}
                  {editingJob.schedule?.kind === 'at' && (
                    <>
                      <label className="input-label">Run At</label>
                      <input 
                        type="datetime-local" 
                        value={editingJob.schedule.atMs ? new Date(editingJob.schedule.atMs).toISOString().slice(0, 16) : ''} 
                        onChange={e => setEditingJob({...editingJob, schedule: {...editingJob.schedule!, atMs: new Date(e.target.value).getTime()}})}
                        className="premium-input"
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="input-label">Agent Prompt / Message</label>
                <textarea 
                  value={editingJob.payload?.message} 
                  onChange={e => setEditingJob({...editingJob, payload: {...editingJob.payload!, message: e.target.value}})}
                  placeholder="What should the agent do?"
                  className="premium-input"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  required
                />
              </div>

              <div>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Command (Optional)</span>
                  <span style={{ fontSize: '0.75rem', textTransform: 'none', color: 'var(--text-subtle)' }}>AI-Generated Shell Script</span>
                </label>
                <input 
                  type="text" 
                  value={editingJob.payload?.command || ''} 
                  onChange={e => setEditingJob({...editingJob, payload: {...editingJob.payload!, command: e.target.value}})}
                  placeholder="e.g. python3 /path/to/script.py"
                  className="premium-input"
                  style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label className="input-label">Channel</label>
                  <select 
                    value={editingJob.payload?.channel} 
                    onChange={e => setEditingJob({...editingJob, payload: {...editingJob.payload!, channel: e.target.value}})}
                    className="premium-input"
                  >
                    <option value="cli">CLI</option>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="slack">Slack</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Recipient ID / To</label>
                  <input 
                    type="text" 
                    value={editingJob.payload?.to} 
                    onChange={e => setEditingJob({...editingJob, payload: {...editingJob.payload!, to: e.target.value}})}
                    placeholder="direct"
                    className="premium-input"
                  />
                </div>
              </div>

              <div className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={editingJob.payload?.deliver} 
                  onChange={e => setEditingJob({...editingJob, payload: {...editingJob.payload!, deliver: e.target.checked}})}
                  id="deliver"
                />
                <label htmlFor="deliver">Deliver response to user</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="premium-button secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="premium-button primary" disabled={actionLoading === 'save'}>
                  {actionLoading === 'save' ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {jobToDelete && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem', color: 'var(--danger)' }}>
              <Trash2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Delete Cron Job?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Are you sure you want to delete <strong>{jobToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button"
                className="premium-button secondary" 
                style={{ flex: 1 }} 
                onClick={() => setJobToDelete(null)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="premium-button danger" 
                style={{ flex: 1 }} 
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .job-card {
          border-left: 4px solid transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .job-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .job-card.disabled {
          border-left-color: rgba(255,255,255,0.1);
        }
        .job-card:not(.disabled) {
          border-left-color: var(--accent-violet);
        }

        .premium-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .premium-button.primary {
          background: linear-gradient(135deg, var(--accent-violet), var(--accent-blue));
          color: white;
          border: none;
        }
        .premium-button.primary:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .premium-button.secondary {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
        }
        .premium-button.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .premium-button.danger {
          background: linear-gradient(135deg, #ef4444, #991b1b);
          color: white;
          border: none;
        }
        .premium-button.danger:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        }

        .premium-icon-button {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.05);
          color: var(--text-muted);
        }

        .premium-icon-button.test:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }
        .premium-icon-button.edit:hover {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
          border-color: rgba(139, 92, 246, 0.3);
        }
        .premium-icon-button.delete:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }
        .premium-icon-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .input-label {
          display: block; 
          margin-bottom: 0.5rem; 
          font-size: 0.85rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .premium-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem 1.2rem;
          color: white;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .premium-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--accent-violet);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }

        select.premium-input {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1.2em;
          padding-right: 2.5rem;
        }

        select.premium-input option {
          background-color: #121217;
          color: white;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          font-size: 0.95rem;
          color: var(--text-subtle);
          cursor: pointer;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px) saturate(180%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: rgba(18, 18, 23, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
