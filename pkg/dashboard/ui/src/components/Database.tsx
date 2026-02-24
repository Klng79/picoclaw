import { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

interface RowData {
  [key: string]: any;
}

export function Database() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For Wipe Confirmation
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  
  // For Row Deletion Confirmation
  const [rowToDelete, setRowToDelete] = useState<string | number | null>(null);

  const getPort = () => window.location.port === '5173' ? '18790' : window.location.port;
  const getHost = () => window.location.hostname;

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchRows(selectedTable);
    } else {
      setRows([]);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      const res = await fetch(`http://${getHost()}:${getPort()}/api/v1/db/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data || []);
        if (data && data.length > 0 && !selectedTable) {
          setSelectedTable(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch tables:', e);
    }
  };

  const fetchRows = async (table: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://${getHost()}:${getPort()}/api/v1/db/query?table=${table}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data || []);
      } else {
        setError(`Failed to fetch rows: ${res.statusText}`);
      }
    } catch (e) {
      setError(`Error fetching rows: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteRow = async () => {
    if (rowToDelete === null) return;
    
    try {
      const res = await fetch(`http://${getHost()}:${getPort()}/api/v1/db/row?table=${selectedTable}&id=${rowToDelete}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRowToDelete(null);
        fetchRows(selectedTable);
      } else {
        alert('Failed to delete row');
      }
    } catch (e) {
      alert(`Error deleting row: ${e}`);
    }
  };

  const wipeTable = async () => {
    try {
      const res = await fetch(`http://${getHost()}:${getPort()}/api/v1/db/table`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table: selectedTable })
      });
      if (res.ok) {
        setShowWipeConfirm(false);
        fetchRows(selectedTable);
      } else {
        alert('Failed to wipe table');
      }
    } catch (e) {
      alert(`Error wiping table: ${e}`);
    }
  };

  if (tables.length === 0) {
    return (
      <div className="section-header">
        <h2>Database Explorer</h2>
        <div style={{ color: 'var(--text-muted)' }}>Connecting to database...</div>
      </div>
    );
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Database Explorer</h2>
          <p style={{ color: 'var(--text-muted)' }}>Raw access to local SQLite persistence</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedTable} 
            onChange={(e) => setSelectedTable(e.target.value)}
            className="glass-input"
            style={{ width: '200px' }}
          >
            {tables.map(t => (
              <option key={t} value={t} style={{ background: '#111', color: 'white' }}>{t}</option>
            ))}
          </select>
          
          <button 
            className="glass-button" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }} 
            onClick={() => fetchRows(selectedTable)} 
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          
          <button 
            className="glass-button" 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'rgba(255, 51, 102, 0.2)', 
              borderColor: 'rgba(255, 51, 102, 0.5)' 
            }} 
            onClick={() => setShowWipeConfirm(true)}
            disabled={!selectedTable || rows.length === 0}
          >
            <AlertTriangle size={18} /> Wipe Table
          </button>
        </div>
      </div>

      {showWipeConfirm && (
        <div className="config-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="config-modal" style={{ maxWidth: '400px', background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--panel-border)' }}>
            <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <AlertTriangle size={24} /> Warning: Destructive Action
            </h3>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
              You are about to permanently delete ALL rows from the <strong>{selectedTable}</strong> table. This action cannot be undone. Are you absolutely sure?
            </p>
            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }} onClick={() => setShowWipeConfirm(false)}>Cancel</button>
              <button className="glass-button" style={{ background: 'rgba(255, 51, 102, 0.4)', borderColor: 'rgba(255, 51, 102, 0.6)' }} onClick={wipeTable}>Yes, Wipe Table</button>
            </div>
          </div>
        </div>
      )}

      {rowToDelete !== null && (
        <div className="config-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="config-modal" style={{ maxWidth: '400px', background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--panel-border)' }}>
            <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <Trash2 size={24} /> Delete Row
            </h3>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
              Are you sure you want to delete this row? This action cannot be undone.
            </p>
            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }} onClick={() => setRowToDelete(null)}>Cancel</button>
              <button className="glass-button" style={{ background: 'rgba(255, 51, 102, 0.4)', borderColor: 'rgba(255, 51, 102, 0.6)' }} onClick={confirmDeleteRow}>Yes, Delete Row</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ marginTop: '2rem', overflowX: 'auto' }}>
        {loading ? (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : error ? (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        ) : rows.length === 0 ? (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>The table is empty.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {columns.map(col => (
                  <th key={col} style={{ padding: '1rem', color: 'var(--accent-cyan)', fontSize: '0.9rem', textTransform: 'uppercase' }}>{col}</th>
                ))}
                <th style={{ padding: '1rem', width: '80px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rowId = row.id || row.key;
                return (
                  <tr key={rowId || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {columns.map(col => {
                      const rawVal = row[col];
                      let displayVal = String(rawVal);
                      if (typeof rawVal === 'object' && rawVal !== null) {
                        displayVal = JSON.stringify(rawVal);
                      } else if (typeof rawVal === 'string' && rawVal.trim().startsWith('{')) {
                        try {
                          const parsed = JSON.parse(rawVal);
                          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.content !== undefined) {
                            displayVal = String(parsed.content);
                          }
                        } catch (e) {}
                      }
                      
                      return (
                        <td key={col} style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal)}>
                          {displayVal}
                        </td>
                      );
                    })}
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      <button 
                        className="glass-button" 
                        style={{ 
                          padding: '0.5rem', 
                          background: 'rgba(255, 51, 102, 0.1)', 
                          borderColor: 'rgba(255, 51, 102, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={() => setRowToDelete(rowId as string|number)}
                        title="Delete Row"
                      >
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
