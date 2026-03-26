import React from 'react';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString();
}

export default function ActionLog({ actions }) {
  const reversed = actions ? [...actions].reverse() : [];

  return (
    <div className="card" id="action-log-panel">
      <div className="card-header">
        <span className="card-title">📋 Action Log</span>
        <span className="card-badge" style={{ background: 'rgba(96,165,250,0.1)', color: 'var(--status-info)' }}>
          {actions?.length || 0} events
        </span>
      </div>

      <div className="action-log">
        {reversed.length === 0 ? (
          <div className="action-log-empty">No actions recorded yet</div>
        ) : (
          reversed.map((item, i) => (
            <div className="action-item" key={`${item.timestamp}-${i}`}>
              <div className={`action-severity-dot ${item.severity || 'info'}`} />
              <div className="action-content">
                <div className="action-text">{item.action}</div>
                {item.details && <div className="action-details">{item.details}</div>}
              </div>
              <div className="action-time">{formatTime(item.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
