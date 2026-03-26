import React from 'react';
import { useMetrics } from './hooks/useMetrics';
import MetricsCards from './components/MetricsCards';
import LiveChart from './components/LiveChart';
import AnomalyChart from './components/AnomalyChart';
import PredictionPanel from './components/PredictionPanel';
import ActionLog from './components/ActionLog';
import ControlPanel from './components/ControlPanel';

function getSystemStatus(metrics, activeMode) {
  if (!metrics) return 'healthy';
  if (activeMode && activeMode !== 'none') return 'critical';
  if (metrics.is_anomaly) return 'warning';
  if (metrics.cpu > 80 || metrics.latency > 200) return 'warning';
  return 'healthy';
}

const STATUS_LABELS = { healthy: 'All Systems Normal', warning: 'Anomaly Detected', critical: 'Incident Active' };

export default function App() {
  const {
    currentMetrics, prediction, actions, history,
    activeMode, connectionStatus,
    triggerSpike, triggerAttack, triggerFailure, clearSimulation,
  } = useMetrics();

  const status = getSystemStatus(currentMetrics, activeMode);

  return (
    <div className="app-container">
      {}
      <header className="app-header" id="app-header">
        <div className="header-left">
          <div className="header-logo">AS</div>
          <div>
            <div className="header-title">AutoShield AI</div>
            <div className="header-subtitle">Autonomous IT Monitoring System</div>
          </div>
        </div>
        <div className="header-right">
          <div className="ws-status">
            <div className={`ws-dot ${connectionStatus === 'disconnected' ? 'disconnected' : 'connected'}`} />
            {connectionStatus === 'connected' ? 'WebSocket' : connectionStatus === 'polling' ? 'Polling' : 'Disconnected'}
          </div>
          <div className={`status-badge ${status}`}>
            <div className={`status-dot ${status}`} />
            {STATUS_LABELS[status]}
          </div>
        </div>
      </header>

      {}
      <MetricsCards metrics={currentMetrics} history={history} />

      {}
      <div className="dashboard-grid">
        <LiveChart history={history} />

        {}
        <AnomalyChart history={history} currentScore={currentMetrics?.anomaly_score} />
        <PredictionPanel prediction={prediction} history={history} />

        {}
        <ActionLog actions={actions} />
        <ControlPanel
          onSpike={triggerSpike}
          onAttack={triggerAttack}
          onFailure={triggerFailure}
          onClear={clearSimulation}
          activeMode={activeMode}
        />
      </div>
    </div>
  );
}
