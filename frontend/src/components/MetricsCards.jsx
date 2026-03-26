
import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

function SparkLine({ data, dataKey, color }) {
  if (!data || data.length < 2) return null;
  const sparkData = data.slice(-30);
  return (
    <div className="metric-sparkline">
      <ResponsiveContainer width="100%" height={32}>
        <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${dataKey})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCard({ type, label, value, unit, icon, color, history, dataKey, isAnomaly }) {
  return (
    <div className={`metric-card ${type}`} id={`metric-card-${type}`}>
      {isAnomaly && (
        <div className="metric-anomaly-indicator">
          <div className="anomaly-dot" />
        </div>
      )}
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {typeof value === 'number' ? value.toFixed(1) : '—'}
        <span className="metric-unit"> {unit}</span>
      </div>
      <SparkLine data={history} dataKey={dataKey} color={color} />
    </div>
  );
}

export default function MetricsCards({ metrics, history }) {
  const isAnomaly = metrics?.is_anomaly || false;

  return (
    <div className="metrics-row" id="metrics-panel">
      <MetricCard
        type="cpu"
        label="CPU Usage"
        value={metrics?.cpu}
        unit="%"
        icon="⚡"
        color="#6366f1"
        history={history}
        dataKey="cpu"
        isAnomaly={isAnomaly}
      />
      <MetricCard
        type="memory"
        label="Memory"
        value={metrics?.memory}
        unit="%"
        icon="🧠"
        color="#a78bfa"
        history={history}
        dataKey="memory"
        isAnomaly={isAnomaly}
      />
      <MetricCard
        type="traffic"
        label="Traffic"
        value={metrics?.traffic}
        unit="req/s"
        icon="🌐"
        color="#22d3ee"
        history={history}
        dataKey="traffic"
        isAnomaly={false}
      />
      <MetricCard
        type="latency"
        label="Latency"
        value={metrics?.latency}
        unit="ms"
        icon="⏱️"
        color="#fbbf24"
        history={history}
        dataKey="latency"
        isAnomaly={isAnomaly}
      />
    </div>
  );
}
