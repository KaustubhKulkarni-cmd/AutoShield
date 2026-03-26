
import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';
const MAX_HISTORY = 120; 
const POLL_INTERVAL = 1000; 
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 10000;

export function useMetrics() {
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [actions, setActions] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeMode, setActiveMode] = useState('none');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const pollTimerRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const processUpdate = useCallback((state) => {
    if (!state) return;

    const metrics = state.metrics || state;
    setCurrentMetrics(metrics);

    if (state.prediction) {
      setPrediction(state.prediction);
    }

    if (state.recent_actions) {
      setActions(state.recent_actions);
    }

    if (state.active_anomaly_mode !== undefined) {
      setActiveMode(state.active_anomaly_mode);
    }

    setHistory(prev => {
      const point = {
        time: new Date(metrics.timestamp * 1000).toLocaleTimeString(),
        timestamp: metrics.timestamp,
        cpu: metrics.cpu,
        memory: metrics.memory,
        traffic: metrics.traffic,
        latency: metrics.latency,
        anomalyScore: metrics.anomaly_score || 0,
        isAnomaly: metrics.is_anomaly || false,
        anomalyMode: metrics.anomaly_mode || 'none',
      };
      const next = [...prev, point];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'history' && Array.isArray(data.data)) {
            const historyPoints = data.data.map(m => ({
              time: new Date(m.timestamp * 1000).toLocaleTimeString(),
              timestamp: m.timestamp,
              cpu: m.cpu,
              memory: m.memory,
              traffic: m.traffic,
              latency: m.latency,
              anomalyScore: m.anomaly_score || 0,
              isAnomaly: m.is_anomaly || false,
              anomalyMode: m.anomaly_mode || 'none',
            }));
            setHistory(historyPoints.slice(-MAX_HISTORY));
            return;
          }

          processUpdate(data);
        } catch (e) {
          console.warn('[useMetrics] Parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn('[useMetrics] WS connect failed:', e);
      scheduleReconnect();
    }
  }, [processUpdate]);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current),
      RECONNECT_MAX_DELAY
    );
    reconnectAttempts.current++;

    if (!pollTimerRef.current) {
      startPolling();
    }

    setTimeout(() => {
      connectWebSocket();
    }, delay);
  }, [connectWebSocket]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/metrics`);
        if (res.ok) {
          const data = await res.json();
          processUpdate(data);
          setConnectionStatus('polling');
        }
      } catch {
      }
    }, POLL_INTERVAL);
  }, [processUpdate]);

  const triggerSpike = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/simulate/spike`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to trigger spike:', e);
    }
  }, []);

  const triggerAttack = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/simulate/attack`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to trigger attack:', e);
    }
  }, []);

  const triggerFailure = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/simulate/failure`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to trigger failure:', e);
    }
  }, []);

  const clearSimulation = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/simulate/clear`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to clear simulation:', e);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/metrics/history?limit=60`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const points = data.map(m => ({
            time: new Date(m.timestamp * 1000).toLocaleTimeString(),
            timestamp: m.timestamp,
            cpu: m.cpu,
            memory: m.memory,
            traffic: m.traffic,
            latency: m.latency,
            anomalyScore: m.anomaly_score || 0,
            isAnomaly: m.is_anomaly || false,
            anomalyMode: m.anomaly_mode || 'none',
          }));
          setHistory(points);
        }
      })
      .catch(() => {});

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [connectWebSocket]);

  return {
    currentMetrics,
    prediction,
    actions,
    history,
    activeMode,
    connectionStatus,
    triggerSpike,
    triggerAttack,
    triggerFailure,
    clearSimulation,
  };
}
