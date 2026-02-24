import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  label: string;
  color: string;
  subtext?: string;
}

export function ProgressBar({ value, label, color, subtext }: ProgressBarProps) {
  return (
    <div className="stat-card glass-panel" style={{ alignItems: 'flex-start', padding: '2rem' }}>
      <div className="stat-title">{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
        <span className="stat-value">{value.toFixed(1)}%</span>
        {subtext && <span style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{subtext}</span>}
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '12px', 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: color,
            boxShadow: `0 0 10px ${color}`,
            borderRadius: '6px'
          }}
        />
      </div>
    </div>
  );
}
