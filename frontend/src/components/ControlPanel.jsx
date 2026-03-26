import React from 'react';

const ANOMALY_LABELS = {
  none: null,
  cpu_spike: 'CPU Spike',
  ddos_attack: 'DDoS Attack',
  gradual_failure: 'Gradual Failure',
};

export default function ControlPanel({ onSpike, onAttack, onFailure, onClear, activeMode }) {
  const modeLabel = ANOMALY_LABELS[activeMode];

  return (
    <div className="card" id="control-panel">
      <div className="card-header">
        <span className="card-title">🎮 Simulation Control</span>
      </div>

      <div className="control-panel">
        <button className="control-btn spike" onClick={onSpike} id="btn-spike">
          <div className="control-btn-icon">⚡</div>
          <div className="control-btn-text">
            <div className="control-btn-label">Trigger CPU Spike</div>
            <div className="control-btn-desc">Sudden CPU surge — 30s duration</div>
          </div>
        </button>

        <button className="control-btn attack" onClick={onAttack} id="btn-attack">
          <div className="control-btn-icon">🔥</div>
          <div className="control-btn-text">
            <div className="control-btn-label">Trigger DDoS Attack</div>
            <div className="control-btn-desc">Traffic flood — 45s duration</div>
          </div>
        </button>

        <button className="control-btn failure" onClick={onFailure} id="btn-failure">
          <div className="control-btn-icon">📉</div>
          <div className="control-btn-text">
            <div className="control-btn-label">Trigger Gradual Failure</div>
            <div className="control-btn-desc">Slow degradation — 60s duration</div>
          </div>
        </button>

        <button className="control-btn clear" onClick={onClear} id="btn-clear">
          <div className="control-btn-icon">✓</div>
          <div className="control-btn-text">
            <div className="control-btn-label">Clear Simulation</div>
            <div className="control-btn-desc">Return to normal operation</div>
          </div>
        </button>
      </div>

      {modeLabel && (
        <div className="active-mode">
          <div className="anomaly-dot" style={{ width: 8, height: 8 }} />
          <span className="active-mode-label">Active:</span>
          <span className="active-mode-value">{modeLabel}</span>
        </div>
      )}
    </div>
  );
}
