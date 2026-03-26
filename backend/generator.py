"""

Synthetic Telemetry Generator for AutoShield AI.



Generates correlated, temporally-consistent system metrics with:

- Sinusoidal base patterns + Gaussian noise

- Gradual drift over time

- Mandatory cross-metric correlations

- Injection of realistic anomaly modes (spikes, DDoS, gradual failure)

- Rolling state history for temporal consistency

"""



import asyncio

import time

import math

import numpy as np

from collections import deque

from typing import AsyncGenerator, Optional

from models import MetricSnapshot, AnomalyMode





class TelemetryState:

    """Maintains the evolving internal state of the synthetic system."""



    def __init__(self):

        self.tick: int = 0

        self.start_time: float = time.time()



                                                                     

        self.cpu_history: deque = deque(maxlen=300)

        self.memory_history: deque = deque(maxlen=300)

        self.traffic_history: deque = deque(maxlen=300)

        self.latency_history: deque = deque(maxlen=300)



                                                      

        self.cpu_drift: float = 0.0

        self.memory_drift: float = 0.0

        self.traffic_drift: float = 0.0



                                 

        self.anomaly_mode: AnomalyMode = AnomalyMode.NONE

        self.anomaly_start_tick: int = 0

        self.anomaly_duration: int = 0         



                               

        self._prev_cpu: float = 35.0

        self._prev_memory: float = 45.0

        self._prev_traffic: float = 120.0

        self._prev_latency: float = 50.0



    @property

    def elapsed(self) -> float:

        return time.time() - self.start_time



    @property

    def anomaly_active(self) -> bool:

        if self.anomaly_mode == AnomalyMode.NONE:

            return False

        return (self.tick - self.anomaly_start_tick) < self.anomaly_duration



    @property

    def anomaly_progress(self) -> float:

        """0.0 to 1.0 progress through anomaly duration."""

        if not self.anomaly_active:

            return 0.0

        elapsed = self.tick - self.anomaly_start_tick

        return min(elapsed / max(self.anomaly_duration, 1), 1.0)





class SyntheticGenerator:

    """

    Production-grade synthetic telemetry generator.

    

    Correlations enforced:

      - traffic ↑ → CPU ↑

      - CPU ↑ → latency ↑  

      - memory follows CPU trends (with lag)

    """



                                                           

    ALPHA = 0.3



                             

    CPU_BASE = 35.0

    CPU_AMPLITUDE = 12.0

    CPU_PERIOD = 120.0                          



    TRAFFIC_BASE = 120.0

    TRAFFIC_AMPLITUDE = 40.0

    TRAFFIC_PERIOD = 90.0



    MEMORY_BASE = 45.0

    MEMORY_FOLLOW_FACTOR = 0.4                                  



    LATENCY_BASE = 45.0

    LATENCY_CPU_FACTOR = 0.8                           

    LATENCY_TRAFFIC_FACTOR = 0.15                               



                                          

    DRIFT_RATE = 0.002

    DRIFT_REVERT_RATE = 0.001



    def __init__(self):

        self.state = TelemetryState()

        self._rng = np.random.default_rng(seed=None)



    def inject_anomaly(self, mode: AnomalyMode, duration: int = 30):

        """Inject an anomaly mode for a specified duration (in ticks/seconds)."""

        self.state.anomaly_mode = mode

        self.state.anomaly_start_tick = self.state.tick

        self.state.anomaly_duration = duration



    def clear_anomaly(self):

        """Clear any active anomaly."""

        self.state.anomaly_mode = AnomalyMode.NONE



    def _ema(self, prev: float, new: float, alpha: float = None) -> float:

        """Exponential moving average for smooth transitions."""

        a = alpha if alpha is not None else self.ALPHA

        return a * new + (1 - a) * prev



    def _update_drift(self):

        """Slowly evolve baseline drift with mean reversion."""

        drift_noise = self._rng.normal(0, self.DRIFT_RATE)

        self.state.cpu_drift += drift_noise - self.state.cpu_drift * self.DRIFT_REVERT_RATE

        self.state.memory_drift += self._rng.normal(0, self.DRIFT_RATE * 0.5) - self.state.memory_drift * self.DRIFT_REVERT_RATE

        self.state.traffic_drift += self._rng.normal(0, self.DRIFT_RATE * 0.8) - self.state.traffic_drift * self.DRIFT_REVERT_RATE



                      

        self.state.cpu_drift = np.clip(self.state.cpu_drift, -8, 8)

        self.state.memory_drift = np.clip(self.state.memory_drift, -5, 5)

        self.state.traffic_drift = np.clip(self.state.traffic_drift, -15, 15)



    def _generate_base_traffic(self, t: float) -> float:

        """Generate base traffic with sinusoidal pattern + noise."""

        sin_component = self.TRAFFIC_AMPLITUDE * math.sin(2 * math.pi * t / self.TRAFFIC_PERIOD)

        secondary_wave = (self.TRAFFIC_AMPLITUDE * 0.3) * math.sin(2 * math.pi * t / (self.TRAFFIC_PERIOD * 2.7))

        noise = self._rng.normal(0, 5)

        return self.TRAFFIC_BASE + sin_component + secondary_wave + noise + self.state.traffic_drift



    def _generate_base_cpu(self, t: float, traffic: float) -> float:

        """Generate CPU correlated with traffic."""

        sin_component = self.CPU_AMPLITUDE * math.sin(2 * math.pi * t / self.CPU_PERIOD)

        secondary_wave = (self.CPU_AMPLITUDE * 0.25) * math.sin(2 * math.pi * t / (self.CPU_PERIOD * 3.1))

        noise = self._rng.normal(0, 2.5)



                                         

        traffic_effect = (traffic - self.TRAFFIC_BASE) * 0.15



        return self.CPU_BASE + sin_component + secondary_wave + noise + traffic_effect + self.state.cpu_drift



    def _generate_memory(self, cpu: float) -> float:

        """Memory follows CPU trends with lag and its own noise."""

                                             

        if len(self.state.cpu_history) >= 5:

            lagged_cpu = np.mean(list(self.state.cpu_history)[-5:])

        else:

            lagged_cpu = cpu



        memory_from_cpu = self.MEMORY_BASE + (lagged_cpu - self.CPU_BASE) * self.MEMORY_FOLLOW_FACTOR

        noise = self._rng.normal(0, 1.5)

        return memory_from_cpu + noise + self.state.memory_drift



    def _generate_latency(self, cpu: float, traffic: float) -> float:

        """Latency correlated with both CPU and traffic."""

        cpu_effect = (cpu - self.CPU_BASE) * self.LATENCY_CPU_FACTOR

        traffic_effect = (traffic - self.TRAFFIC_BASE) * self.LATENCY_TRAFFIC_FACTOR

        noise = self._rng.normal(0, 3)



                                                       

        if cpu > 70:

            cpu_effect *= 1.5 + (cpu - 70) * 0.05



        return self.LATENCY_BASE + cpu_effect + traffic_effect + noise



    def _apply_anomaly(self, cpu: float, memory: float, traffic: float, latency: float):

        """Apply anomaly effects based on current mode and progress."""

        mode = self.state.anomaly_mode

        progress = self.state.anomaly_progress



        if mode == AnomalyMode.CPU_SPIKE:

                                                   

            if progress < 0.2:

                spike_intensity = progress / 0.2           

            elif progress < 0.6:

                spike_intensity = 1.0             

            else:

                spike_intensity = 1.0 - (progress - 0.6) / 0.4         



            cpu_spike = 35 * spike_intensity + self._rng.normal(0, 3)

            cpu += cpu_spike

                                

            latency += cpu_spike * 1.2

            memory += cpu_spike * 0.3



        elif mode == AnomalyMode.DDOS_ATTACK:

                                                                   

            if progress < 0.1:

                attack_intensity = progress / 0.1

            elif progress < 0.7:

                attack_intensity = 0.8 + 0.2 * math.sin(progress * 20)                    

            else:

                attack_intensity = 1.0 - (progress - 0.7) / 0.3



            traffic_surge = 300 * attack_intensity + self._rng.normal(0, 20)

            traffic += traffic_surge

                               

            cpu += traffic_surge * 0.12

            latency += traffic_surge * 0.5 + cpu * 0.3

            memory += traffic_surge * 0.05



        elif mode == AnomalyMode.GRADUAL_FAILURE:

                                                           

            failure_factor = progress ** 1.5                            

            cpu += 25 * failure_factor + self._rng.normal(0, 1)

            memory += 30 * failure_factor + self._rng.normal(0, 0.8)

            latency += 80 * failure_factor + self._rng.normal(0, 2)

            traffic -= 20 * failure_factor                                    



        return cpu, memory, traffic, latency



    def generate_tick(self) -> MetricSnapshot:

        """Generate one tick of telemetry data."""

        t = self.state.tick

        self.state.tick += 1



                      

        self._update_drift()



                                                 

        raw_traffic = self._generate_base_traffic(t)

        raw_cpu = self._generate_base_cpu(t, raw_traffic)

        raw_memory = self._generate_memory(raw_cpu)

        raw_latency = self._generate_latency(raw_cpu, raw_traffic)



                               

        current_mode = self.state.anomaly_mode if self.state.anomaly_active else AnomalyMode.NONE

        if self.state.anomaly_active:

            raw_cpu, raw_memory, raw_traffic, raw_latency = self._apply_anomaly(

                raw_cpu, raw_memory, raw_traffic, raw_latency

            )

        else:

                                                      

            if self.state.anomaly_mode != AnomalyMode.NONE:

                self.state.anomaly_mode = AnomalyMode.NONE



                                                  

        cpu = self._ema(self.state._prev_cpu, raw_cpu)

        memory = self._ema(self.state._prev_memory, raw_memory, alpha=0.2)                         

        traffic = self._ema(self.state._prev_traffic, raw_traffic)

        latency = self._ema(self.state._prev_latency, raw_latency)



                                   

        cpu = float(np.clip(cpu, 1, 99))

        memory = float(np.clip(memory, 5, 98))

        traffic = float(max(traffic, 1))

        latency = float(max(latency, 5))



                      

        self.state._prev_cpu = cpu

        self.state._prev_memory = memory

        self.state._prev_traffic = traffic

        self.state._prev_latency = latency



        self.state.cpu_history.append(cpu)

        self.state.memory_history.append(memory)

        self.state.traffic_history.append(traffic)

        self.state.latency_history.append(latency)



        return MetricSnapshot(

            timestamp=time.time(),

            cpu=round(cpu, 2),

            memory=round(memory, 2),

            traffic=round(traffic, 2),

            latency=round(latency, 2),

            anomaly_mode=current_mode,

        )



    async def stream(self, interval: float = 1.0) -> AsyncGenerator[MetricSnapshot, None]:

        """Async generator yielding metrics every `interval` seconds."""

        while True:

            yield self.generate_tick()

            await asyncio.sleep(interval)

