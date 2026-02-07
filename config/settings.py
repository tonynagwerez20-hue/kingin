import os
from pathlib import Path

# --- PROJECT PATHS ---
PROJECT_ROOT = Path(__file__).parent.parent
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)

# --- NETWORK CONFIG ---
API_URL = os.getenv("API_URL", "http://localhost:8000")
DTC_HOST = os.getenv("DTC_HOST", "127.0.0.1")
DTC_PORT_LIVE = int(os.getenv("DTC_PORT_LIVE", 11099))
DTC_PORT_HIST = int(os.getenv("DTC_PORT_HIST", 11098))

# --- TRADING CONFIG ---
DEFAULT_ACCOUNT_BALANCE = 10000.0
PIP_VALUE = 10.0
PIP_SIZE = 0.01
BALANCE_REFRESH_INTERVAL = 60
LOOP_INTERVAL = 1

# --- SYSTEM FLAGS ---
ENABLE_CLEANUP = False
ENABLE_IGOF = False  # Disabled by default per user request

# --- SYMBOLS ---
DEFAULT_SYMBOLS = ["XAUUSD", "GC", "ZN", "6E", "ES"]
