"""
KingIn Dashboard API Server

Provides REST endpoints for the kingin-vite React dashboard.
Bridges between the React frontend and the Python trading engine.

Runs on port 8080. The Vite dev server proxies /api/* to this server.
"""
import asyncio
import json
import os
import sqlite3
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

PROJECT_ROOT = Path(__file__).parent

_engine_process: Optional[subprocess.Popen] = None
_engine_start_time: Optional[float] = None

import secrets as _secrets
_CONTROL_TOKEN = os.environ.get("KINGIN_API_TOKEN") or _secrets.token_hex(16)

app = FastAPI(title="KingIn Dashboard API", version="1.0.0")

_ALLOWED_ORIGINS = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_db_path() -> Path:
    return PROJECT_ROOT / "data" / "hedge.db"


def _read_db_state() -> dict:
    """Read account and trade state from hedge.db."""
    db_path = _get_db_path()
    state = {
        "account_balance": 0.0,
        "account_equity": 0.0,
        "floating_pnl": 0.0,
        "open_trades_count": 0,
        "positions": [],
    }

    if not db_path.exists():
        return state

    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT key, value FROM system_state")
            for row in cursor.fetchall():
                key, val = row["key"], row["value"]
                try:
                    if key == "account_balance":
                        state["account_balance"] = float(val) if val else 0.0
                    elif key == "account_equity":
                        state["account_equity"] = float(val) if val else 0.0
                except (ValueError, TypeError):
                    pass
        except Exception:
            pass

        try:
            cursor.execute(
                "SELECT * FROM trades WHERE status='open' ORDER BY entry_time DESC"
            )
            rows = cursor.fetchall()
            positions = []
            total_floating = 0.0
            for row in rows:
                r = dict(row)
                floating = float(r.get("floating_pnl") or 0.0)
                total_floating += floating
                positions.append({
                    "symbol": r.get("symbol", "XAUUSD"),
                    "type": r.get("direction", "BUY"),
                    "lots": float(r.get("volume") or 0.0),
                    "open_price": float(r.get("entry_price") or 0.0),
                    "current_price": float(
                        r.get("current_price") or r.get("entry_price") or 0.0
                    ),
                    "sl": float(r.get("sl") or 0.0),
                    "tp": float(r.get("tp") or 0.0),
                    "floating_pnl": floating,
                    "open_time": r.get("entry_time", ""),
                })
            state["positions"] = positions
            state["floating_pnl"] = total_floating
            state["open_trades_count"] = len(positions)
        except Exception:
            pass

        conn.close()
    except Exception as e:
        print(f"[API] DB read error: {e}")

    return state


def _read_audit_state() -> dict:
    """Read latest signal and engine state from audit log."""
    audit_path = PROJECT_ROOT / "storage" / "logs" / "audit.json"
    state = {
        "bias": "NEUTRAL",
        "signal_action": "WAITING",
        "entry_price": 0.0,
        "stop_loss": 0.0,
        "take_profit": 0.0,
        "lot_size": 0.0,
        "execution_type": "MARKET",
        "confluence_score": 0.0,
        "killzone": "N/A",
        "session_time": "N/A",
        "rr_ratio": "0.00",
        "current_price": 0.0,
        "symbol": "XAUUSD",
        "layers": [],
        "last_trade": None,
        "warnings": [],
        "pipeline_log": [],
    }

    if not audit_path.exists():
        return state

    try:
        with open(audit_path, "r") as f:
            logs = json.load(f)

        if not logs:
            return state

        state["pipeline_log"] = [
            f"[{entry.get('timestamp', '')}] {entry.get('event', entry.get('message', ''))}"
            for entry in logs[-20:]
            if isinstance(entry, dict)
        ]

        for entry in reversed(logs):
            if not isinstance(entry, dict):
                continue
            event = (entry.get("event") or entry.get("type") or "").lower()
            data = entry.get("data", entry)

            if "signal" in event or (isinstance(data, dict) and "signal" in str(data).lower()):
                if isinstance(data, dict):
                    state["signal_action"] = data.get(
                        "action", data.get("signal_action", "WAITING")
                    )
                    state["entry_price"] = float(
                        data.get("entry_price", data.get("entry", 0.0)) or 0.0
                    )
                    state["stop_loss"] = float(
                        data.get("stop_loss", data.get("sl", 0.0)) or 0.0
                    )
                    state["take_profit"] = float(
                        data.get("take_profit", data.get("tp", 0.0)) or 0.0
                    )
                    state["lot_size"] = float(
                        data.get("lot_size", data.get("lots", 0.0)) or 0.0
                    )
                    state["confluence_score"] = float(
                        data.get("confluence_score", data.get("score", 0.0)) or 0.0
                    )
                    state["bias"] = data.get("bias", "NEUTRAL")
                    state["current_price"] = float(
                        data.get("current_price", data.get("price", 0.0)) or 0.0
                    )
                    state["killzone"] = data.get("killzone", "N/A")
                    state["session_time"] = data.get("session_time", "N/A")
                    if state["entry_price"] and state["stop_loss"]:
                        sl_dist = abs(state["entry_price"] - state["stop_loss"])
                        tp_dist = abs(state["take_profit"] - state["entry_price"]) if state["take_profit"] else 0
                        if sl_dist > 0:
                            state["rr_ratio"] = f"{tp_dist / sl_dist:.2f}"
                    if "layers" in data and isinstance(data["layers"], list):
                        state["layers"] = data["layers"]
                break

        state["warnings"] = [
            entry.get("message", str(entry))
            for entry in logs[-50:]
            if isinstance(entry, dict)
            and (entry.get("level") or "").upper() in ("WARN", "WARNING", "ERROR")
        ][-10:]

        for entry in reversed(logs):
            if not isinstance(entry, dict):
                continue
            event = (entry.get("event") or "").lower()
            data = entry.get("data", {})
            if "trade" in event and isinstance(data, dict) and data.get("action"):
                state["last_trade"] = {
                    "action": data.get("action"),
                    "symbol": data.get("symbol", "XAUUSD"),
                    "price": float(data.get("price", 0.0) or 0.0),
                    "lots": float(data.get("lots", data.get("lot_size", 0.0)) or 0.0),
                    "sl": float(data.get("sl", 0.0) or 0.0),
                    "tp": float(data.get("tp", 0.0) or 0.0),
                    "bias": data.get("bias", "N/A"),
                    "timestamp": entry.get("timestamp", ""),
                }
                break

    except Exception as e:
        print(f"[API] Audit read error: {e}")

    return state


def _is_engine_running() -> bool:
    global _engine_process
    if _engine_process is None:
        return False
    return _engine_process.poll() is None


def _build_engine_state() -> dict:
    """Compose full engine state from all available sources."""
    db_state = _read_db_state()
    audit_state = _read_audit_state()
    running = _is_engine_running()

    state = {
        "timestamp": time.time(),
        "running": running,
        "engine_mode": "live" if running else "stopped",
    }
    state.update(db_state)
    state.update(audit_state)
    return state


def _check_token(request: Request) -> bool:
    """Validate control token for engine lifecycle endpoints."""
    provided = request.headers.get("X-Control-Token", "")
    return provided == _CONTROL_TOKEN


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "time": time.time(), "token": _CONTROL_TOKEN})


@app.post("/engine/init")
async def engine_init():
    return JSONResponse({"success": True, "message": "KingIn API server ready"})


@app.post("/engine/auth")
async def engine_auth(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    token = f"api_token_{int(time.time())}"
    return JSONResponse({"success": True, "token": token})


@app.get("/engine/state")
async def engine_state():
    state = _build_engine_state()
    return JSONResponse(state)


@app.post("/engine/start")
async def engine_start(request: Request):
    if not _check_token(request):
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=403)
    global _engine_process, _engine_start_time

    if _is_engine_running():
        return JSONResponse({"success": True, "message": "Engine already running"})

    try:
        engine_script = PROJECT_ROOT / "Engine" / "main_loop.py"
        if not engine_script.exists():
            return JSONResponse({
                "success": False,
                "error": f"Engine script not found: {engine_script}",
            })

        log_dir = PROJECT_ROOT / "storage" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        engine_log = open(log_dir / "engine_stdout.log", "a")
        _engine_process = subprocess.Popen(
            [sys.executable, str(engine_script)],
            cwd=str(PROJECT_ROOT),
            stdout=engine_log,
            stderr=engine_log,
        )
        _engine_start_time = time.time()

        await asyncio.sleep(1.0)

        if _engine_process.poll() is not None:
            return JSONResponse({
                "success": False,
                "error": "Engine exited immediately. Check storage/logs/engine_stdout.log for details.",
            })

        return JSONResponse({
            "success": True,
            "message": "Engine started",
            "pid": _engine_process.pid,
        })
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)})


@app.post("/engine/stop")
async def engine_stop(request: Request):
    if not _check_token(request):
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=403)
    global _engine_process

    if not _is_engine_running():
        return JSONResponse({"success": True, "message": "Engine not running"})

    try:
        _engine_process.terminate()
        try:
            _engine_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _engine_process.kill()

        _engine_process = None
        return JSONResponse({"success": True, "message": "Engine stopped"})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)})


if __name__ == "__main__":
    print(f"[KingIn API] Starting on http://127.0.0.1:8080 (localhost only)")
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="info")
