"""

AutoShield AI — FastAPI Backend Server.



Production-grade monitoring backend with:

  - Async synthetic telemetry generation (1s interval)  

  - Real-time metric streaming via WebSocket

  - ML-powered anomaly detection + CPU prediction

  - Anomaly injection endpoints

  - Action logging

"""



import asyncio

import time

import json

from contextlib import asynccontextmanager

from typing import List



from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from fastapi.middleware.cors import CORSMiddleware



from models import (

    MetricSnapshot, PredictionResult, ActionLogEntry,

    SystemState, AnomalyMode,

)

from generator import SyntheticGenerator

from ml_engine import AnomalyDetector, CPUPredictor





                                                                



generator = SyntheticGenerator()

anomaly_detector = AnomalyDetector()

cpu_predictor = CPUPredictor()



                

metrics_history: List[MetricSnapshot] = []

action_log: List[ActionLogEntry] = []

MAX_HISTORY = 300



              

latest_state: SystemState = None



                       

ws_connections: List[WebSocket] = []





                                                                



async def telemetry_loop():

    """Background task: generate + score + predict every second."""

    global latest_state



    while True:

        try:

                                          

            snapshot = generator.generate_tick()



                                      

            score, is_anomaly = anomaly_detector.ingest(snapshot)

            snapshot.anomaly_score = round(score, 4)

            snapshot.is_anomaly = is_anomaly



                                   

            cpu_predictor.ingest(snapshot.cpu)

            prediction = cpu_predictor.predict()



                      

            metrics_history.append(snapshot)

            if len(metrics_history) > MAX_HISTORY:

                del metrics_history[:len(metrics_history) - MAX_HISTORY]



                                   

            if is_anomaly and score > 0.6:

                log_action(

                    action=f"Anomaly detected — score {score:.2f}",

                    severity="warning" if score < 0.8 else "critical",

                    details=f"CPU={snapshot.cpu:.1f}% Traffic={snapshot.traffic:.0f}req/s Latency={snapshot.latency:.0f}ms",

                )



                            

            latest_state = SystemState(

                metrics=snapshot,

                prediction=prediction,

                recent_actions=action_log[-20:],

                history_length=len(metrics_history),

                active_anomaly_mode=generator.state.anomaly_mode if generator.state.anomaly_active else AnomalyMode.NONE,

            )



                                               

            await broadcast_state(latest_state)



        except Exception as e:

            print(f"[telemetry_loop] Error: {e}")



        await asyncio.sleep(1.0)





async def broadcast_state(state: SystemState):

    """Send current state to all connected WebSocket clients."""

    if not ws_connections:

        return



    data = json.dumps(state.model_dump(), default=str)

    dead = []



    for ws in ws_connections:

        try:

            await ws.send_text(data)

        except Exception:

            dead.append(ws)



    for ws in dead:

        ws_connections.remove(ws)





def log_action(action: str, severity: str = "info", details: str = ""):

    """Append an entry to the action log."""

    entry = ActionLogEntry(

        timestamp=time.time(),

        action=action,

        severity=severity,

        details=details,

    )

    action_log.append(entry)

    if len(action_log) > 100:

        del action_log[:len(action_log) - 100]





                                                                



@asynccontextmanager

async def lifespan(app: FastAPI):

    """Start background telemetry on startup."""

    task = asyncio.create_task(telemetry_loop())

    log_action("System initialized", "info", "AutoShield AI monitoring started")

    yield

    task.cancel()





                                                                



app = FastAPI(

    title="AutoShield AI — Monitoring Backend",

    version="1.0.0",

    lifespan=lifespan,

)



app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)





                                                                



@app.get("/metrics", response_model=SystemState)

async def get_metrics():

    """Get latest system state (metrics + prediction + actions)."""

    if latest_state is None:

        return SystemState(

            metrics=MetricSnapshot(cpu=0, memory=0, traffic=0, latency=0),

        )

    return latest_state





@app.get("/metrics/history")

async def get_history(limit: int = 60):

    """Get recent metric history for chart rendering."""

    limit = min(limit, MAX_HISTORY)

    history = metrics_history[-limit:]

    return [snap.model_dump() for snap in history]





@app.post("/simulate/spike")

async def simulate_spike():

    """Inject a CPU spike anomaly (30s duration)."""

    generator.inject_anomaly(AnomalyMode.CPU_SPIKE, duration=30)

    log_action(

        "CPU spike injected",

        severity="warning",

        details="Manual trigger — 30s duration",

    )

    return {"status": "ok", "mode": "cpu_spike", "duration": 30}





@app.post("/simulate/attack")

async def simulate_attack():

    """Inject a DDoS-style traffic attack (45s duration)."""

    generator.inject_anomaly(AnomalyMode.DDOS_ATTACK, duration=45)

    log_action(

        "DDoS attack simulated",

        severity="critical",

        details="Manual trigger — 45s duration",

    )

    return {"status": "ok", "mode": "ddos_attack", "duration": 45}





@app.post("/simulate/failure")

async def simulate_failure():

    """Inject a gradual system failure (60s duration)."""

    generator.inject_anomaly(AnomalyMode.GRADUAL_FAILURE, duration=60)

    log_action(

        "Gradual failure injected",

        severity="critical",

        details="Manual trigger — 60s duration",

    )

    return {"status": "ok", "mode": "gradual_failure", "duration": 60}





@app.post("/simulate/clear")

async def clear_simulation():

    """Clear any active anomaly simulation."""

    generator.clear_anomaly()

    log_action("Anomaly simulation cleared", "info")

    return {"status": "ok", "mode": "none"}





                                                                



@app.websocket("/ws")

async def websocket_endpoint(ws: WebSocket):

    """Real-time WebSocket stream of system state."""

    await ws.accept()

    ws_connections.append(ws)

    log_action("WebSocket client connected", "info")



    try:

                                    

        history = metrics_history[-60:]

        await ws.send_text(json.dumps({

            "type": "history",

            "data": [snap.model_dump() for snap in history],

        }, default=str))



                               

        while True:

                                                               

            data = await ws.receive_text()

                                               

    except WebSocketDisconnect:

        pass

    finally:

        if ws in ws_connections:

            ws_connections.remove(ws)





                                                                



@app.get("/health")

async def health():

    return {

        "status": "healthy",

        "uptime_ticks": generator.state.tick,

        "history_size": len(metrics_history),

        "ws_clients": len(ws_connections),

    }

