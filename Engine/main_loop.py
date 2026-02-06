import asyncio
import sys
from pathlib import Path
import pandas as pd
import time
import importlib.util
import gc
import subprocess
import pkg_resources

def check_dependencies():
    """Verify all requirements are installed, attempt auto-fix if missing."""
    requirements_file = Path(__file__).parent.parent / "requirements.txt"
    if not requirements_file.exists():
        return
    
    with open(requirements_file, "r") as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    
    missing = []
    for req in requirements:
        try:
            pkg_resources.require(req)
        except (pkg_resources.DistributionNotFound, pkg_resources.VersionConflict):
            missing.append(req)
    
    if missing:
        print(f"[Startup] Missing dependencies detected: {missing}")
        print("[Startup] Attempting automatic installation...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)])
            print("[Startup] Installation successful. Please restart the system.")
            sys.exit(0)
        except Exception as e:
            print(f"[Startup] Automatic installation failed: {e}")
            print("[Startup] Please run: pip install -r requirements.txt manually.")
            sys.exit(1)

# ensure project root is on path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# --- CONFIG ---
API_URL = "http://localhost:8000"
DEFAULT_ACCOUNT_BALANCE = 10000.0  # Fallback if MT5 not connected
PIP_VALUE = 10.0
PIP_SIZE = 0.01
BALANCE_REFRESH_INTERVAL = 60  # Refresh balance every 60 seconds

# Buffers
from collections import deque
HTF_BUFFER = deque(maxlen=500)
MTF_BUFFER = deque(maxlen=500)
LTF_BUFFER = deque(maxlen=500)

LOOP_INTERVAL = 1
ENABLE_CLEANUP = False
ENABLE_IGOF = False # User Request: Disable IGOF Filter by default


# --- Imports ---
# --- Imports ---
# Dynamic import for dispatcher
try:
    from networking.dispatcher import DataDispatcher, delta_buffers, ohlc_buffers, dispatch_batch
    from networking.server import build_delta_struct
except ImportError:
    # Check if we need to look in networking if the root import fails
    networking_path = project_root / "networking"
    sys.path.append(str(networking_path))
    # Try data_feed path as well since we know it's there
    data_feed_path = project_root / "data_feed" 
    sys.path.append(str(data_feed_path))
    
    try:
        from data_feed.dispatcher import DataDispatcher, delta_buffers, ohlc_buffers, dispatch_batch
    except ImportError:
         from dispatcher import DataDispatcher, delta_buffers, ohlc_buffers, dispatch_batch

    from server import build_delta_struct

# Logic imports
try:
    from support.strategies.composite_strategy import CompositeStrategy
    from support.strategies.manager import StrategyManager
    from support.strategies.orderflow import OrderflowStrategy
    from support.strategies.filter_one import FilterOne
    from support.strategies.filter_two import FilterTwo
    
    from support.risk.risk_manager import RiskManager
    from support.risk.cro_rules import CRORules
    from support.risk.regime_layer import RegimeLayer
    from support.risk.broker_watchdog import BrokerWatchdog
    
    from support.audit_logger import AuditLogger
    
    from execution.bridge import Bridge
    from Engine.position_tracker import PositionTracker
    from support.notifications.alert_manager import alert_manager
    # IGOF Filtration
    from Engine.igof.stack import FiltrationController
except ImportError as e:
    print(f"Import Error: {e}")

# ... (Previous imports and config remain) ...

async def main():
    check_dependencies()
    print("Starting Main Trading Loop with Modular Batch-Flow Architecture...")
    import aiohttp
    
    # v3.9 Startup Logic: Wait for data feed server (Uvicorn) to bind port 8000
    print("[Main] Waiting 3 seconds for Data Feed Server to bind...")
    await asyncio.sleep(3)

    # ========== PRE-FLIGHT CHECKS ==========
    print("\n" + "="*60)
    print("PRE-FLIGHT SYSTEM VALIDATION")
    print("="*60 + "\n")
    
    # Initialize Bridge
    bridge = None
    try:
        print("[Pre-Flight] Testing MT5 Bridge connection...")
        bridge = Bridge(pub_port=5555, req_port=5557)
        
        if not bridge.connected:
            print("\n[ERROR] [CRITICAL] MT5 Bridge NOT CONNECTED")
            print("   Possible causes:")
            print("   1. MetaTrader 5 is not running")
            print("   2. Algo Trading is disabled (must be GREEN)")
            print("   3. EA is not attached to chart")
            print("   4. DLL imports not allowed in MT5 settings")
            print("\n   Fix: Run diagnostic script first:")
            print("   python tests/diag_system_health.py\n")
            sys.exit(1)
        
        # Test heartbeat
        heartbeat = bridge.check_connection()
        if not heartbeat:
            print("\n[ERROR] [CRITICAL] MT5 Bridge heartbeat FAILED")
            print("   EA is not responding. Check MT5 'Experts' tab for errors.")
            print("   Ensure EA shows smiley face (not sad face)\n")
            sys.exit(1)
        
        print("✅ [Pre-Flight] MT5 Bridge: CONNECTED")
        
    except Exception as e:
        print(f"\n❌ [CRITICAL] MT5 Bridge initialization failed: {e}")
        print("   Run diagnostic script: python tests/diag_system_health.py\n")
        sys.exit(1)
    
    # Initialize Position Tracker
    position_tracker = PositionTracker()
    
    # Initialize Risk Defense
    risk_manager = RiskManager()
    cro_rules = CRORules()
    regime_layer = RegimeLayer()
    broker_watchdog = BrokerWatchdog()
    audit_logger = AuditLogger()
    
    # Initialize Modular Strategies
    from support.strategies.candlestick_trigger import CandlestickStrategy
    alpha_strategies = [
        CandlestickStrategy(),
        FilterOne(),
        FilterTwo()
    ]
    strategy_manager = StrategyManager(alpha_strategies)
    
    # Initialize IGOF Controller
    filtration = FiltrationController()
    
    print(f"✅ [Pre-Flight] 5-layer Risk Defense & Modular Alpha and IGOF initialized.")
    
    # Fetch initial account balance from MT5
    account_balance = DEFAULT_ACCOUNT_BALANCE
    last_balance_check = 0
    
    # Instance of database for state persistence
    db = position_tracker.db if position_tracker else None
    
    if bridge and bridge.connected:
        print("[Pre-Flight] Fetching MT5 account balance...")
        fetched_balance = bridge.get_account_balance()
        if fetched_balance is not None:
            account_balance = fetched_balance
            print(f"✅ [Pre-Flight] MT5 account balance: ${account_balance:,.2f}")
            if db:
                db.set_state("account_balance", account_balance)
                db.set_state("balance_last_sync", time.time())
        else:
            print(f"[WARN] [Pre-Flight] MT5 balance fetch timeout, using default: ${account_balance:.2f}")
    else:
        print(f"[WARN] [Pre-Flight] MT5 not connected, using default balance: ${account_balance:.2f}")

    # Wait for buffers to populate before starting signal generation
    print("[Main] Waiting for DTC to populate buffers...")
    warmup_start = time.time()
    warmup_timeout = 180  # v3.2 hardening: Increased to 180s for robust multi-TF sync
    
    async with aiohttp.ClientSession() as session:
        while time.time() - warmup_start < warmup_timeout:
            try:
                # 0. Check DTC Sync Status
                async with session.get(f"{API_URL}/status") as status_resp:
                    if status_resp.status == 200:
                        status_data = await status_resp.json()
                        if status_data.get("mode") == "DTC" and not status_data.get("is_synced"):
                            print(f"[Main] DTC History Syncing... {status_data.get('pending_count')} TFs left.")
                            await asyncio.sleep(2)
                            continue

                # 1. Check buffer status
                async with session.get(f"{API_URL}/ohlc?tf=H1&limit=1") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        candle_data = data.get("candles", [])
                        h1_count = len(candle_data) if candle_data else 0
                
                async with session.get(f"{API_URL}/ohlc?tf=M15&limit=1") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        candle_data = data.get("candles", [])
                        m15_count = len(candle_data) if candle_data else 0
                
                async with session.get(f"{API_URL}/ohlc?tf=M5&limit=1") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        candle_data = data.get("candles", [])
                        m5_count = len(candle_data) if candle_data else 0
                
                # Check if minimum data is available (H1 can be less than 500 initially)
                if h1_count > 0 and m15_count > 0 and m5_count > 0:
                    print(f"[Main] ✅ DTC Synced & Buffers Ready.")
                    break
                else:
                    print(f"[Main] Waiting for bars... H1={h1_count} M15={m15_count} M5={m5_count}")
                    await asyncio.sleep(2)
            except Exception as e:
                print(f"[Main] Waiting for data feed server: {e}")
                await asyncio.sleep(2)
        else:
            # v3.4: Strict Startup Guard - Do not proceed with partial data
            print(f"[Main] [WARN] WARNING: Warmup timed out after {warmup_timeout}s")
            print("[Main] [CRITICAL] [ALERT] Startup Aborted: DTC History Sync Incomplete.")
            print("[Main] [ACTION] Check Sierra Chart Connection or 'Recycle' logic.")
            sys.exit(1)
    
    async with aiohttp.ClientSession() as session:
        while True:
            try:
                # 1. Fetch Data Batches (H1, M15, M5)
                # ... (Fetching code remains same, just ensuring context) ...
                
                # Fetch H1
                async with session.get(f"{API_URL}/ohlc?tf=H1&limit=50") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        h1_candles = data.get("candles", [])
                        dispatch_batch(h1_candles, HTF_BUFFER)

                # Fetch M15
                async with session.get(f"{API_URL}/ohlc?tf=M15&limit=50") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        m15_candles = data.get("candles", [])
                        dispatch_batch(m15_candles, MTF_BUFFER)

                # Fetch M5
                async with session.get(f"{API_URL}/ohlc?tf=M5&limit=50") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        m5_candles = data.get("candles", [])
                        dispatch_batch(m5_candles, LTF_BUFFER)

                # Fetch Delta (M5) - Keep at 500 for strategy logic
                delta_struct = None
                async with session.get(f"{API_URL}/delta?tf=M5&limit=500") as resp:
                    if resp.status == 200:
                        delta_struct = await resp.json()
                
                # --- 2. Risk Layer Verification ---
                # A. Detect Regime
                regime = regime_layer.detect_regime(list(LTF_BUFFER))
                risk_manager.update_regime(regime)
                
                # B. Check Execution Veto - ENFORCE IT!
                if not risk_manager.check_execution_allowed():
                    print("[Risk] GLOBAL VETO ACTIVE - Skipping signal generation")
                    audit_logger.log_event("RISK", "GLOBAL_VETO", {"regime": regime})
                    await asyncio.sleep(LOOP_INTERVAL)
                    audit_logger.log_event("RISK", "GLOBAL_VETO", {"regime": regime})
                    await asyncio.sleep(LOOP_INTERVAL)
                    continue  # Skip this iteration entirely
                
                # --- 2.5 IGOF Filtration (Context & Orderflow) ---
                if ENABLE_IGOF:
                    # Update Macro/Profile State with latest M5 batch
                    if LTF_BUFFER:
                        filtration.update_batch(list(LTF_BUFFER))

                    # Fetch Correlation Data (M15)
                    igof_data = {}
                    async with session.get(f"{API_URL}/ohlc?tf=M15&symbol=GC&limit=50") as resp:
                         if resp.status == 200: igof_data["gc_m15"] = (await resp.json()).get("candles", [])
                    async with session.get(f"{API_URL}/ohlc?tf=M15&symbol=ZN&limit=50") as resp:
                         if resp.status == 200: igof_data["zn_m15"] = (await resp.json()).get("candles", [])
                    async with session.get(f"{API_URL}/ohlc?tf=M15&symbol=6E&limit=50") as resp:
                         if resp.status == 200: igof_data["6e_m15"] = (await resp.json()).get("candles", [])
                    async with session.get(f"{API_URL}/ohlc?tf=M15&symbol=ES&limit=50") as resp:
                         if resp.status == 200: igof_data["es_m15"] = (await resp.json()).get("candles", [])
                    
                    # Fetch Depth
                    async with session.get(f"{API_URL}/depth?symbol=GC") as resp:
                         if resp.status == 200: igof_data["depth"] = await resp.json()
                    
                    igof_data["price"] = LTF_BUFFER[-1]["close"] if LTF_BUFFER else 0
                    
                    igof_result = filtration.process(igof_data)
                    
                    if igof_result["action"] == "NO_TRADE":
                         pass # For now, just Log, don't block UNTIL VERIFIED. User request is "Integrate".
                         # Actually, User spec says "Rule: No layer may be skipped. If any layer fails, NO_TRADE is returned."
                         # BUT to avoid halting the system completely before testing, I will just LOG CRITICAL WARNING for now.
                         # OR strictly follow instructions.
                         # "Rule: No layer may be skipped." -> I should BLOCK.
                         # But I'll print it loudly.
                         # print(f"[IGOF] BLOCKED: {igof_result['reason']}")
                         # continue 
                         # I will uncomment the block line but maybe comment out the continue for the first run to allow strategy testing?
                         # No, "create a filtration strategy that FOLLOWS the above document". Strict compliance.
                         print(f"[IGOF] 🛑 BLOCKED: {igof_result['reason']}")
                         audit_logger.log_event("IGOF", "BLOCKED", igof_result)
                         await asyncio.sleep(LOOP_INTERVAL)
                         continue
                
                # --- 3. Strategy Logic Analysis ---
                # Check session time (XAUUSD priority: London + NY)
                # UTC Time based
                from datetime import datetime, timezone
                now_utc = datetime.now(timezone.utc)
                hour_utc = now_utc.hour
                
                # Trading Window: 08:00 to 21:00 UTC (London Open through NY Close)
                is_trade_session = 8 <= hour_utc < 21
                
                # Periodic balance and trade refresh (every 60 seconds)
                current_time = time.time()
                if bridge and bridge.connected and (current_time - last_balance_check) > BALANCE_REFRESH_INTERVAL:
                    # 1. Sync Balance
                    fetched_balance = bridge.get_account_balance()
                    if fetched_balance is not None:
                        account_balance = fetched_balance
                        print(f"[Main] Balance updated: ${account_balance:.2f}")
                        if db:
                            db.set_state("account_balance", account_balance)
                            db.set_state("balance_last_sync", time.time())
                    
                    # 2. Sync Trades (Open and History)
                    if db:
                        try:
                            # A. Sync Open Positions
                            open_positions = bridge.get_open_positions()
                            for pos in open_positions:
                                pos["status"] = "open"
                                db.upsert_trade(pos)
                            
                            # B. Sync Recent History
                            closed_history = bridge.get_trade_history(days=2)
                            for trade in closed_history:
                                trade["status"] = "closed"
                                db.upsert_trade(trade)
                                
                            print(f"[Main] Synced {len(open_positions)} open and {len(closed_history)} closed trades from MT5.")
                            if len(open_positions) == 0 and len(closed_history) == 0:
                                # Provide hint if sync is silent or failing
                                pass
                        except Exception as sync_err:
                            print(f"[Main] Trade sync error: {sync_err}")

                    last_balance_check = current_time
                
                # Strategy manager handles confluence and reversals internally.
                signal_evt = strategy_manager.aggregate_signals(
                    htf_buffer=list(HTF_BUFFER),
                    mtf_buffer=list(MTF_BUFFER),
                    ltf_buffer=list(LTF_BUFFER),
                    delta_struct=delta_struct,
                    position_tracker=position_tracker,
                    account_balance=account_balance,  # Use dynamic balance
                    verbose_logs=True  # Enable detailed logging to diagnose filter failures
                )
                
                if signal_evt:
                    audit_logger.log_event("STRATEGY", "SIGNAL_GENERATED", {"signal": signal_evt})
                
                # Filter for session (Exits always allowed)
                if signal_evt and "CLOSE" not in signal_evt["action"] and not is_trade_session:
                    print(f"[Session] Entry BLOCKED: Non-trading session (UTC {hour_utc})")
                    signal_evt = None
                
                # --- 4. Microstructure Audit (Pre-Execution) ---
                if signal_evt and "CLOSE" not in signal_evt["action"]:
                    # Fetch REAL spread from data feed
                    spread = 1.5  # Default fallback
                    try:
                        async with session.get(f"{API_URL}/spread") as resp:
                            if resp.status == 200:
                                spread_data = await resp.json()
                                spread = spread_data.get("spread", 1.5)
                    except Exception as e:
                        print(f"[Warning] Could not fetch spread: {e}")
                    
                    market_state = {
                        "spread": spread,
                        "volume": LTF_BUFFER[-1]["volume"] if LTF_BUFFER else 1.0
                    }
                    audit_res = cro_rules.audit_trade_request(signal_evt, market_state)
                    
                    if audit_res["status"] == "FAIL":
                        audit_logger.log_event("CRO", "RISK_VETO", {"signal": signal_evt, "reason": audit_res["reason"]})
                        print(f"[Risk] VETO: {audit_res['reason']}")
                        signal_evt = None # Block entry
                    else:
                        audit_logger.log_event("CRO", "PASS", {"signal": signal_evt})
                
                if signal_evt:
                    action = signal_evt.get("action")
                    price = signal_evt.get("price")
                    sl = signal_evt.get("sl")
                    lots = signal_evt.get("lots")
                    desc = signal_evt.get("desc")
                    symbol = signal_evt.get("symbol", "XAUUSD")
                    
                    print(f"[SIGNAL] {action} | {desc} | Price: {price} | Lots: {lots}")
                    
                    # Dispatch to Bridge
                    if bridge:
                        bridge.send_signal(signal_evt)
                        
                    # Update Internal Position Tracker
                    if "CLOSE" in action:
                         position_tracker.close_position(price)
                         alert_manager.send_email(f"Trade EXIT: {action}", desc)
                         
                    elif "REVERSE" in action:
                        position_tracker.close_position(price)
                        new_dir = "LONG" if "LONG" in action else "SHORT"
                        position_tracker.open_position(new_dir, symbol, price, lots, sl)
                        alert_manager.send_email(f"Trade REVERSAL: {action}", desc)
                        
                    elif action in ["LONG", "SHORT"]:
                        position_tracker.open_position(action, symbol, price, lots, sl)
                        alert_manager.send_email(f"Trade ENTRY: {action}", desc)

                # Heartbeat / Status
                if not signal_evt and int(time.time()) % 10 == 0:
                     # Basic status printing
                     pass


            
            except Exception as e:
                print(f"Loop Error: {e}")
                import traceback
                traceback.print_exc()

            # Periodic memory cleanup (low-spec optimization)
            if ENABLE_CLEANUP and int(time.time()) % 300 == 0:
                gc.collect()
                
            await asyncio.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
