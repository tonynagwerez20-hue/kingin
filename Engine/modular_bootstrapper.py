import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from contextlib import nullcontext
from Engine.registry import ComponentRegistry
from Engine.igof.igof_engine import IGOFEngine
from Engine.base_interfaces import BaseDataProvider, BaseFiltrationLayer, BaseStrategy, BaseRiskRule
from Engine.lite_log_handler import setup_lite_logging
from storage.hedge_db import HedgeDB

# Setup default logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ModularBootstrapper")

class ModularBootstrapper:
    """
    Dynamically loads and connects components based on trading_params_lite.json.
    Supports "Hot Swapping" and "Lite Mode" for low-end hardware.
    """
    
    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.config = self._load_json_config()
        
        # Performance Settings
        perf_cfg = self.config.get("performance", {})
        self.lite_mode = perf_cfg.get("lite_mode", False)
        self.loop_delay = perf_cfg.get("loop_delay_seconds", 1.0)
        
        # Initialize optimized logging for Lite mode
        if self.lite_mode:
            setup_lite_logging("engine_lite.log")
            logger.info("LITE MODE ENABLED: Performance optimizations active.")
        
        # Pipeline components
        self.data_provider: BaseDataProvider = None
        self.filtration_engine: IGOFEngine = None
        self.strategies: List[BaseStrategy] = []
        self.risk_rules: List[BaseRiskRule] = []
        
        # Initialize database for state persistence
        db_path = Path("data/hedge.db")
        self.db = HedgeDB(str(db_path))
        self.last_balance_sync = 0.0

    def _load_json_config(self) -> Dict:
        """Reads the JSON configuration file."""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config from {self.config_path}: {e}")
            logging.shutdown() # Ensure logs are flushed
            sys.exit(1)

    def build_pipeline(self):
        """
        Builds the entire trading pipeline dynamically using the Registry.
        """
        logger.info("[VERIFICATION] Building modular pipeline v6.1 (Latest)...")
        pipeline_cfg = self.config.get("pipeline", {})
        
        # 1. Load Data Provider
        from data_feed.factory import DataProviderFactory
        
        active_source = pipeline_cfg.get("active_data_source", "MT5_PROVIDER")
        dp_cfg = pipeline_cfg.get("data_provider", {}) # Fallback if specific config needed
        
        # Merge performance settings into provider config
        dp_config = dp_cfg.get("config", {})
        if self.lite_mode:
            dp_config["lite_mode"] = True
            
        try:
            self.data_provider = DataProviderFactory.get_provider(active_source, dp_config)
            
            if not self.data_provider.connect():
                logger.error(f"Data Provider {active_source} failed to connect.")
                sys.exit(1)
        except Exception as e:
            logger.error(f"Critical error loading data provider: {e}")
            logging.shutdown()
            sys.exit(1)
        
        # ... (rest of loading logic remains similar, but using the loaded config)
        
        # 2. Load Filtration Layers
        layers_cfg = pipeline_cfg.get("filtration_layers", [])
        loaded_layers = []
        for l_cfg in layers_cfg:
            layer = ComponentRegistry.load_component(l_cfg["class_path"], config=l_cfg.get("config"))
            loaded_layers.append(layer)
        
        self.filtration_engine = IGOFEngine(layers=loaded_layers)
        
        # 3. Load Strategies
        strat_cfg = pipeline_cfg.get("strategies", [])
        self.strategies = []
        for s_cfg in strat_cfg:
            strategy = ComponentRegistry.load_component(s_cfg["class_path"], config=s_cfg.get("config"))
            self.strategies.append(strategy)
            
        # 4. Load Risk Rules
        risk_cfg = pipeline_cfg.get("risk_rules", [])
        self.risk_rules = []
        for r_cfg in risk_cfg:
            rule = ComponentRegistry.load_component(r_cfg["class_path"], config=r_cfg.get("config"))
            self.risk_rules.append(rule)
            
        logger.info("Pipeline built successfully.")

    def run_main_loop(self):
        """
        Modified loop for Lite mode behavior with CLI Dashboard integration.
        """
        logger.info(f"Starting Modular Main Loop (Delay: {self.loop_delay}s)...")
        symbol = self.config.get("trading", {}).get("symbol", "XAUUSD")
        
        # Initialize CLI Dashboard if enabled
        dashboard = None
        current_state = {
            "account": {"balance": self.config.get("trading", {}).get("default_account_balance", 0.0), "equity": 0.0, "daily_pnl": 0.0, "daily_loss_pct": 0.0},
            "market": {"symbol": symbol, "price": 0.0, "spread": 0.0, "htf_bias": "NEUTRAL"},
            "pipeline": [],
            "signals": []
        }
        
        if self.config.get("performance", {}).get("enable_cli_dashboard", True):
            from Engine.cli_dashboard import CLIDashboard
            from rich.live import Live
            dashboard = CLIDashboard()
            logger.info("CLI Dashboard enabled.")

        # Immediate sync of account info before entering loop
        try:
            acc_info = self.data_provider.get_account_info()
            current_state["account"]["balance"] = acc_info.get("balance", current_state["account"]["balance"])
            current_state["account"]["equity"] = acc_info.get("equity", 0.0)
            self.last_balance_sync = time.time()
            login_id = acc_info.get("login", "Unknown")
            logger.info(f"Initial Account Sync: ${current_state['account']['balance']:,.2f} (Account: {login_id})")
        except Exception as e:
            logger.error(f"Initial account sync failed: {e}")

        try:
            ctx = Live(dashboard.layout, refresh_per_second=4) if dashboard else nullcontext()
            with ctx:
                while True:
                    # 1. Check Master Switch FIRST (Fast Responsiveness)
                    try:
                        with open(self.config_path, 'r') as f:
                            latest_config = json.load(f)
                            master_on = latest_config.get("trading", {}).get("master_switch", True)
                    except Exception as e:
                        logger.error(f"Error reloading config: {e}")
                        master_on = True # Default to on if read fails

                    current_state["market"]["master_switch"] = master_on

                    if not master_on:
                        current_state["pipeline"] = []
                        current_state["market"]["htf_bias"] = "STANDBY"
                        if dashboard:
                            dashboard.update(current_state)
                        # Use a shorter "pulse" when on standby for faster UI response
                        time.sleep(1.0)
                        continue

                    # 2. Fetch Data (Only if Master is ON) - FULL MTF ACQUISITION
                    count = 10 if self.lite_mode else 100
                    
                    market_snapshot = {
                        "symbol": symbol,
                        "tick": self.data_provider.get_tick_data(symbol),
                        "h4_candles": self.data_provider.get_latest_candles(symbol, "H4", count),
                        "h1_candles": self.data_provider.get_latest_candles(symbol, "H1", count),
                        "m15_candles": self.data_provider.get_latest_candles(symbol, "M15", count),
                        "m5_candles": self.data_provider.get_latest_candles(symbol, "M5", count),
                        "m1_candles": self.data_provider.get_latest_candles(symbol, "M1", count)
                    }
                    
                    if not market_snapshot["m5_candles"] or not market_snapshot["tick"]:
                        if dashboard:
                            dashboard.update(current_state) # Show current state while waiting
                        time.sleep(self.loop_delay)
                        continue
                    
                    tick = market_snapshot["tick"]
                    current_state["market"]["price"] = tick.get("ask", 0.0)
                    current_state["market"]["spread"] = (tick.get("ask", 0.0) - tick.get("bid", 0.0)) * 100 # Approx pips

                    # 2. Run Filtration
                    filt_res = self.filtration_engine.process_all_layers(market_snapshot)
                    
                    # Update Pipeline State
                    current_state["pipeline"] = []
                    for layer_res in filt_res.get("layer_results", []):
                        current_state["pipeline"].append({
                            "name": layer_res["layer"],
                            "status": layer_res["result"]["status"],
                            "score": layer_res["result"].get("score", 0.0)
                        })
                    
                    if filt_res["action"] == "TRADE_ALLOWED":
                        current_state["market"]["htf_bias"] = "BULLISH" # Simplified for dashboard
                        current_state["market"]["h4_bias"] = "BULLISH"
                        current_state["market"]["h1_bias"] = "BULLISH"
                        
                        # 3. Generate Signals
                        for strategy in self.strategies:
                            signal = strategy.generate_signal(market_snapshot)
                            if signal.get("action") == "TRADE":
                                # 4. Check Risk
                                all_risk_passed = True
                                for rule in self.risk_rules:
                                    risk_res = rule.check_risk(signal)
                                    if not risk_res.get("allowed", False):
                                        logger.info(f"Trade denied by risk rule: {rule.__class__.__name__}")
                                        all_risk_passed = False
                                        break
                                
                                if all_risk_passed:
                                    logger.info(f"EXECUTING TRADE: {signal}")
                                    signal["time"] = datetime.now().strftime("%H:%M:%S")
                                    current_state["signals"].append(signal)
                                    # Execute via bridge logic here...
                    else:
                        current_state["market"]["htf_bias"] = "NEUTRAL"

                    # 5. Periodic Account Sync (Balance/Equity)
                    if time.time() - self.last_balance_sync > 30:
                        try:
                            acc_info = self.data_provider.get_account_info()
                            balance = acc_info.get("balance", 0.0)
                            self.db.set_state("account_balance", balance)
                            self.db.set_state("balance_last_sync", time.time())
                            current_state["account"]["balance"] = balance
                            current_state["account"]["equity"] = acc_info.get("equity", 0.0)
                            self.last_balance_sync = time.time()
                            logger.info(f"Account Balance Synced: ${balance:,.2f}")
                        except Exception as e:
                            logger.error(f"Failed to sync account balance: {e}")

                    # Update Dashboard
                    if dashboard:
                        dashboard.update(current_state)
                        
                    time.sleep(self.loop_delay)
                
        except KeyboardInterrupt:
            logger.info("System shutting down...")
            if hasattr(self.data_provider, 'shutdown'):
                self.data_provider.shutdown()
            sys.exit(0)
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}")
            if hasattr(self.data_provider, 'shutdown'):
                self.data_provider.shutdown()
            sys.exit(1)

if __name__ == "__main__":
    # Point to the new modular config
    config_file = "config/trading_params_lite.json"
    bootstrapper = ModularBootstrapper(config_file)
    bootstrapper.build_pipeline()
    bootstrapper.run_main_loop() # Activated for proper testing
