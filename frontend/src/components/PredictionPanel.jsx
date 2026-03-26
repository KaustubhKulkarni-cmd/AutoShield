import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

export default function PredictionPanel({ prediction, history }) {
  const trendArrow = prediction?.trend === 'rising' ? '↑' : prediction?.trend === 'falling' ? '↓' : '→';

  const predChartData = React.useMemo(() => {
    if (!history || history.length < 5 || !prediction) return [];
    const actual = history.slice(-30).map((p, i) => ({
      idx: i, label: p.time, actual: p.cpu,
    }));
    const lastIdx = actual.length - 1;
    return [
      ...actual,
      { idx: lastIdx + 5, label: '+5s', predicted: prediction.predicted_cpu_5s },
      { idx: lastIdx + 10, label: '+10s', predicted: prediction.predicted_cpu_10s },
      { idx: lastIdx + 30, label: '+30s', predicted: prediction.predicted_cpu_30s },
    ];
  }, [history, prediction]);

  return (
    <div className="card chart-panel" id="prediction-panel">
      <div className="card-header">
        <span className="card-title">🔮 CPU Prediction</span>
        {prediction && (
          <span className={`prediction-trend ${prediction.trend}`}>
            {trendArrow} {prediction.trend}
          </span>
        )}
      </div>

      {!prediction ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          Model training... (need ~20 data points)
        </div>
      ) : (
        <>
          <div className="prediction-grid">
            <div className="prediction-item">
              <div className="prediction-horizon">+5 seconds</div>
              <div className="prediction-value">{prediction.predicted_cpu_5s?.toFixed(1)}%</div>
            </div>
            <div className="prediction-item">
              <div className="prediction-horizon">+10 seconds</div>
              <div className="prediction-value">{prediction.predicted_cpu_10s?.toFixed(1)}%</div>
            </div>
            <div className="prediction-item">
              <div className="prediction-horizon">+30 seconds</div>
              <div className="prediction-value">{prediction.predicted_cpu_30s?.toFixed(1)}%</div>
            </div>
          </div>

          <div className="confidence-bar">
            <span className="confidence-label">Confidence</span>
            <div className="confidence-track">
              <div className="confidence-fill" style={{ width: `${(prediction.confidence || 0) * 100}%` }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-prediction)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
              {((prediction.confidence || 0) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="chart-container" style={{ height: 160, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={30} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: '0.8rem' }} />
                <Line type="monotone" dataKey="actual" name="Actual CPU" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#34d399" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#34d399' }} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
