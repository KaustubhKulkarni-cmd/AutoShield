
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

function AnomalyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const isAnomaly = payload[0]?.payload?.isAnomaly;

  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      <div className="value-row">
        <span className="dot" style={{ background: score > 0.6 ? '#ef4444' : score > 0.3 ? '#fbbf24' : '#34d399' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Score</span>
        <span className="val" style={{ color: score > 0.6 ? '#ef4444' : score > 0.3 ? '#fbbf24' : '#34d399' }}>
          {(score * 100).toFixed(1)}%
        </span>
      </div>
      {isAnomaly && (
        <div style={{ marginTop: 4, color: '#fb7185', fontSize: '0.75rem', fontWeight: 600 }}>
          ⚠ Flagged as anomalous
        </div>
      )}
    </div>
  );
}

export default function AnomalyChart({ history, currentScore }) {
  const score = currentScore || 0;
  const scoreLevel = score > 0.6 ? 'high' : score > 0.3 ? 'medium' : 'low';
  const scoreColor = score > 0.6 ? '#ef4444' : score > 0.3 ? '#fbbf24' : '#34d399';

  return (
    <div className="card chart-panel" id="anomaly-chart-panel">
      <div className="card-header">
        <span className="card-title">🔍 Anomaly Detection</span>
        <span className="card-badge" style={{
          background: `${scoreColor}15`,
          color: scoreColor,
          border: `1px solid ${scoreColor}30`,
        }}>
          {scoreLevel.toUpperCase()}
        </span>
      </div>

      {}
      <div className="anomaly-score-bar">
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</span>
        <div className="anomaly-bar-track">
          <div
            className={`anomaly-bar-fill ${scoreLevel}`}
            style={{ width: `${Math.min(score * 100, 100)}%` }}
          />
        </div>
        <span className="anomaly-score-value" style={{ color: scoreColor }}>
          {(score * 100).toFixed(0)}%
        </span>
      </div>

      {}
      <div className="chart-container" style={{ height: 200, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history?.slice(-60) || []} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.3} />
                <stop offset="70%" stopColor="#fb7185" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={50}
            />

            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10 }}
              width={30}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            />

            <Tooltip content={<AnomalyTooltip />} />

            <ReferenceLine
              y={0.6}
              stroke="rgba(239, 68, 68, 0.4)"
              strokeDasharray="6 3"
              label={{ value: 'Threshold', position: 'left', fill: '#ef4444', fontSize: 10 }}
            />

            <Area
              type="monotone"
              dataKey="anomalyScore"
              stroke="#fb7185"
              strokeWidth={2}
              fill="url(#anomalyGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
