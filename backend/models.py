"""Pydantic models for the AutoShield AI monitoring system."""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import time


class AnomalyMode(str, Enum):
    NONE = "none"
    CPU_SPIKE = "cpu_spike"
    DDOS_ATTACK = "ddos_attack"
    GRADUAL_FAILURE = "gradual_failure"


class MetricSnapshot(BaseModel):
    """Single point-in-time telemetry reading."""
    timestamp: float = Field(default_factory=time.time)
    cpu: float = Field(..., ge=0, le=100, description="CPU usage %")
    memory: float = Field(..., ge=0, le=100, description="Memory usage %")
    traffic: float = Field(..., ge=0, description="Requests per second")
    latency: float = Field(..., ge=0, description="Response latency in ms")
    anomaly_mode: AnomalyMode = AnomalyMode.NONE
    anomaly_score: float = Field(default=0.0, description="Isolation Forest anomaly score")
    is_anomaly: bool = Field(default=False, description="Whether this point is flagged anomalous")


class PredictionResult(BaseModel):
    """CPU prediction output."""
    current_cpu: float
    predicted_cpu_5s: float
    predicted_cpu_10s: float
    predicted_cpu_30s: float
    trend: str = Field(..., description="rising, falling, or stable")
    confidence: float = Field(default=0.0, ge=0, le=1)


class ActionLogEntry(BaseModel):
    """System action log entry."""
    timestamp: float = Field(default_factory=time.time)
    action: str
    severity: str = Field(default="info", description="info, warning, critical")
    details: str = ""


class SystemState(BaseModel):
    """Full system state snapshot for the frontend."""
    metrics: MetricSnapshot
    prediction: Optional[PredictionResult] = None
    recent_actions: List[ActionLogEntry] = []
    history_length: int = 0
    active_anomaly_mode: AnomalyMode = AnomalyMode.NONE
