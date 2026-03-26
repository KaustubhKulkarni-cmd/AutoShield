
import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload;
  const isAnomaly = point?.isAnomaly;

  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="value-row">
          <span className="dot" style={{ background: entry.color }} />
          <span style={{ color: 'var(--text-secondary)', minWidth: 55 }}>{entry.name}</span>
          <span className="val" style={{ color: entry.color }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </span>
        </div>
      ))}
      {isAnomaly && (
        <div style={{
          marginTop: 6, paddingTop: 6,
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--color-anomaly)', fontSize: '0.75rem', fontWeight: 600
        }}>
          ⚠ Anomaly Detected — Score: {(point.anomalyScore * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export default function LiveChart({ history }) {
  const anomalyRegions = useMemo(() => {
    if (!history || history.length < 2) return [];

    const regions = [];
    let start = null;

    history.forEach((point, i) => {
      if (point.isAnomaly && !start) {
        start = i;
      } else if (!point.isAnomaly && start !== null) {
        regions.push({ x1: start, x2: i - 1 });
        start = null;
      }
    });

    if (start !== null) {
      regions.push({ x1: start, x2: history.length - 1 });
    }

    return regions;
  }, [history]);

  if (!history || history.length < 2) {
    return (
      <div className="card chart-panel full-width" id="live-chart-panel">
        <div className="card-header">
          <span className="card-title">📈 Live System Metrics</span>
        </div>
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          Waiting for data stream...
        </div>
      </div>
    );
  }

  return (
    <div className="card chart-panel full-width" id="live-chart-panel">
      <div className="card-header">
        <span className="card-title">📈 Live System Metrics</span>
        <span className="card-badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-indigo-light)' }}>
          {history.length} points
        </span>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={history} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={40}
            />

            <YAxis
              yAxisId="percent"
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              width={35}
            />

            <YAxis
              yAxisId="value"
              orientation="right"
              tick={{ fontSize: 10 }}
              width={40}
            />

            <Tooltip content={<CustomTooltip />} />

            {}
            {anomalyRegions.map((region, i) => (
              <ReferenceArea
                key={i}
                yAxisId="percent"
                x1={history[region.x1]?.time}
                x2={history[region.x2]?.time}
                fill="rgba(251, 113, 133, 0.08)"
                stroke="rgba(251, 113, 133, 0.2)"
                strokeDasharray="4 4"
              />
            ))}

            <Line
              yAxisId="percent"
              type="monotone"
              dataKey="cpu"
              name="CPU"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              yAxisId="percent"
              type="monotone"
              dataKey="memory"
              name="Memory"
              stroke="#a78bfa"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              strokeDasharray="4 2"
            />

            <Line
              yAxisId="value"
              type="monotone"
              dataKey="traffic"
              name="Traffic"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              yAxisId="value"
              type="monotone"
              dataKey="latency"
              name="Latency"
              stroke="#fbbf24"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#6366f1' }} /> CPU %</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#a78bfa' }} /> Memory %</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#22d3ee' }} /> Traffic</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#fbbf24' }} /> Latency</div>
        {anomalyRegions.length > 0 && (
          <div className="legend-item"><div className="legend-dot" style={{ background: '#fb7185' }} /> Anomaly</div>
        )}
      </div>
    </div>
  );
}
