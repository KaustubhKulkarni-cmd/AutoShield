"""

ML Engine for AutoShield AI.



Provides:

  - Isolation Forest anomaly detection (online scoring)

  - Linear Regression CPU prediction (5s, 10s, 30s ahead)

  

Designed to work with streaming data — models are periodically

retrained on the rolling history buffer.

"""



import numpy as np

from sklearn.ensemble import IsolationForest

from sklearn.linear_model import LinearRegression

from sklearn.preprocessing import StandardScaler

from collections import deque

from typing import Optional, Tuple

from models import MetricSnapshot, PredictionResult





class AnomalyDetector:

    """

    Isolation Forest-based anomaly detector.

    

    Trains on a sliding window of recent metrics and scores

    each new point. Uses feature engineering to make anomalies

    subtle but detectable (rate of change, rolling stats).

    """



    RETRAIN_INTERVAL = 60                           

    MIN_SAMPLES = 30                                        

    CONTAMINATION = 0.08                              



    def __init__(self):

        self._model: Optional[IsolationForest] = None

        self._scaler = StandardScaler()

        self._history: deque = deque(maxlen=300)

        self._sample_count: int = 0

        self._is_fitted: bool = False



    def _extract_features(self, snapshot: MetricSnapshot, history: list = None) -> np.ndarray:

        """

        Extract features from a single metric snapshot.

        

        Features:

          1. cpu, memory, traffic, latency (raw)

          2. cpu-memory ratio

          3. latency-per-request (latency / traffic)

          4. Rate of change (if history available)

          5. Rolling std of CPU (volatility)

        """

        features = [

            snapshot.cpu,

            snapshot.memory,

            snapshot.traffic,

            snapshot.latency,

            snapshot.cpu / max(snapshot.memory, 1),                             

            snapshot.latency / max(snapshot.traffic, 1) * 100,                       

        ]



        if history and len(history) >= 5:

            recent = history[-5:]

            cpu_vals = [s.cpu for s in recent]

            lat_vals = [s.latency for s in recent]



                            

            features.append(snapshot.cpu - cpu_vals[0])

            features.append(snapshot.latency - lat_vals[0])



                                      

            features.append(float(np.std(cpu_vals)))

            features.append(float(np.std(lat_vals)))

        else:

            features.extend([0, 0, 0, 0])



        return np.array(features).reshape(1, -1)



    def ingest(self, snapshot: MetricSnapshot) -> Tuple[float, bool]:

        """

        Ingest a new data point. Returns (anomaly_score, is_anomaly).

        

        Score: negative = more anomalous (sklearn convention)

        We normalize to 0-1 where 1 = most anomalous.

        """

        self._history.append(snapshot)

        self._sample_count += 1



        history_list = list(self._history)

        features = self._extract_features(snapshot, history_list)



                              

        if (self._sample_count % self.RETRAIN_INTERVAL == 0 and

                len(self._history) >= self.MIN_SAMPLES):

            self._retrain(history_list)



        if not self._is_fitted:

            return 0.0, False



                                 

        try:

            scaled = self._scaler.transform(features)

            

                                                                                 

                                                                        

            decision = self._model.decision_function(scaled)[0]



                                                                                                 

                                                                   

                                                                           

            anomaly_score = float(np.clip(0.65 - decision * 4.0, 0.0, 1.0))

            is_anomaly = bool(self._model.predict(scaled)[0] == -1)



            return anomaly_score, is_anomaly

        except Exception:

            return 0.0, False



    def _retrain(self, history: list):

        """Retrain the model on the full history buffer."""

        if len(history) < self.MIN_SAMPLES:

            return



                              

        X = []

        for i, snap in enumerate(history):

            h = history[:i+1] if i >= 5 else None

            feat = self._extract_features(snap, h)

            X.append(feat.flatten())



        X = np.array(X)



                              

        self._scaler = StandardScaler()

        X_scaled = self._scaler.fit_transform(X)



        self._model = IsolationForest(

            n_estimators=100,

            contamination=self.CONTAMINATION,

            random_state=42,

            max_samples='auto',

        )

        self._model.fit(X_scaled)

        self._is_fitted = True





class CPUPredictor:

    """

    Linear Regression-based CPU trend predictor.

    

    Uses recent CPU history to predict future values

    at 5s, 10s, and 30s horizons.

    """



    MIN_HISTORY = 20

    RETRAIN_INTERVAL = 30



    def __init__(self):

        self._model = LinearRegression()

        self._cpu_history: deque = deque(maxlen=300)

        self._sample_count: int = 0

        self._is_fitted: bool = False



    def _build_features(self, cpu_values: list, lookback: int = 10) -> Tuple[np.ndarray, np.ndarray]:

        """

        Build regression features from CPU time series.

        

        Features per sample:

          - Time index

          - Last N values

          - Rolling mean (5-point)

          - Rolling std (5-point)

          - Trend (linear slope of last 10 points)

        """

        X, y = [], []



        for i in range(lookback, len(cpu_values)):

            window = cpu_values[i-lookback:i]

            features = [

                float(i),                                      

                window[-1],                                       

                float(np.mean(window[-5:])),                      

                float(np.std(window[-5:])),                             

                float(np.mean(window[-3:])),                      

                window[-1] - window[0],                           

            ]



                               

            x_indices = np.arange(len(window))

            if len(window) > 1:

                slope = float(np.polyfit(x_indices, window, 1)[0])

            else:

                slope = 0.0

            features.append(slope)



            X.append(features)

            y.append(cpu_values[i])



        return np.array(X), np.array(y)



    def ingest(self, cpu_value: float):

        """Add a new CPU reading."""

        self._cpu_history.append(cpu_value)

        self._sample_count += 1



        if (self._sample_count % self.RETRAIN_INTERVAL == 0 and

                len(self._cpu_history) >= self.MIN_HISTORY):

            self._retrain()



    def predict(self) -> Optional[PredictionResult]:

        """Generate predictions for 5s, 10s, and 30s ahead."""

        if not self._is_fitted or len(self._cpu_history) < 10:

            return None



        cpu_list = list(self._cpu_history)

        current = cpu_list[-1]



                                           

        predictions = {}

        for horizon in [5, 10, 30]:

            pred = self._predict_horizon(cpu_list, horizon)

            predictions[horizon] = float(np.clip(pred, 1, 99))



                         

        recent_slope = predictions[10] - current

        if recent_slope > 2:

            trend = "rising"

        elif recent_slope < -2:

            trend = "falling"

        else:

            trend = "stable"



                                                         

        if len(cpu_list) >= 20:

            recent_std = float(np.std(cpu_list[-20:]))

            confidence = float(np.clip(1.0 - recent_std / 30, 0.1, 0.95))

        else:

            confidence = 0.5



        return PredictionResult(

            current_cpu=round(current, 2),

            predicted_cpu_5s=round(predictions[5], 2),

            predicted_cpu_10s=round(predictions[10], 2),

            predicted_cpu_30s=round(predictions[30], 2),

            trend=trend,

            confidence=round(confidence, 3),

        )



    def _predict_horizon(self, cpu_list: list, horizon: int) -> float:

        """Predict CPU value `horizon` steps ahead."""

        window = cpu_list[-10:]

        current_idx = len(self._cpu_history)



        features = [

            float(current_idx + horizon),

            window[-1],

            float(np.mean(window[-5:])),

            float(np.std(window[-5:])),

            float(np.mean(window[-3:])),

            window[-1] - window[0],

        ]



        x_indices = np.arange(len(window))

        slope = float(np.polyfit(x_indices, window, 1)[0])

        features.append(slope)



        try:

            pred = self._model.predict(np.array(features).reshape(1, -1))[0]

                                                            

            simple_pred = window[-1] + slope * horizon

            return 0.6 * pred + 0.4 * simple_pred

        except Exception:

            return window[-1] + slope * horizon



    def _retrain(self):

        """Retrain the linear regression model."""

        cpu_list = list(self._cpu_history)

        if len(cpu_list) < self.MIN_HISTORY:

            return



        X, y = self._build_features(cpu_list)

        if len(X) < 10:

            return



        self._model = LinearRegression()

        self._model.fit(X, y)

        self._is_fitted = True

