"""
TradingLoopController: Orchestrates the main trading loop logic.

This module extracts the core trading loop from main_loop.py to improve
modularity and testability.
"""

import asyncio
import time
from typing import Dict, Optional, Any
import aiohttp
import pandas as pd


class TradingLoopController:
    """
    Manages the main trading loop, fetching data and processing signals.
    
    Responsibilities:
    - Data fetching from API
    - Signal generation coordination
    - Trade execution coordination
    - Balance updates
    """
    
    def __init__(
        self,
        api_url: str,
        bridge: Any,
        position_tracker: Any,
        risk_manager: Any,
        cro_rules: Any,
        regime_layer: Any,
        broker_watchdog: Any,
        audit_logger: Any,
        strategy_manager: Any,
        filtration: Any,
        db: Any,
        backtest_mode: bool = False
    ):
        """
        Initialize the trading loop controller.
        
        Args:
            api_url: Data feed API URL
            bridge: MT5 Bridge instance
            position_tracker: Position tracking instance
            risk_manager: Risk management instance
            cro_rules: CRO rules instance
            regime_layer: Regime detection instance
            broker_watchdog: Broker monitoring instance
            audit_logger: Audit logging instance
            strategy_manager: Strategy management instance
            filtration: Filtration controller instance
            db: Database instance
            backtest_mode: Whether running in backtest mode
        """
        self.api_url = api_url
        self.bridge = bridge
        self.position_tracker = position_tracker
        self.risk_manager = risk_manager
        self.cro_rules = cro_rules
        self.regime_layer = regime_layer
        self.broker_watchdog = broker_watchdog
        self.audit_logger = audit_logger
        self.strategy_manager = strategy_manager
        self.filtration = filtration
        self.db = db
        self.backtest_mode = backtest_mode
        
        self.account_balance = 0.0
        self.last_balance_check = 0
        self.loop_interval = 1.0
        self.balance_refresh_interval = 300  # 5 minutes
        
    async def fetch_candle_data(self, session: aiohttp.ClientSession, timeframe: str, limit: int = 50) -> list:
        """
        Fetch candle data from the API.
        
        Args:
            session: aiohttp client session
            timeframe: Timeframe to fetch (H1, M15, M5)
            limit: Number of candles to fetch
        
        Returns:
            List of candle dictionaries
        """
        try:
            async with session.get(f"{self.api_url}/ohlc?tf={timeframe}&limit={limit}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("candles", [])
        except Exception as e:
            print(f"[TradingLoop] Error fetching {timeframe} data: {e}")
        return []
    
    async def update_account_balance(self) -> None:
        """Update account balance from MT5 if needed."""
        current_time = time.time()
        if current_time - self.last_balance_check > self.balance_refresh_interval:
            if self.bridge and self.bridge.connected:
                fetched_balance = self.bridge.get_account_balance()
                if fetched_balance is not None:
                    self.account_balance = fetched_balance
                    if self.db:
                        self.db.set_state("account_balance", self.account_balance)
                        self.db.set_state("balance_last_sync", current_time)
            self.last_balance_check = current_time
    
    def check_risk_veto(self) -> Optional[str]:
        """
        Check if risk manager vetoes trading.
        
        Returns:
            Veto reason if trading blocked, None otherwise
        """
        execution_allowed, veto_reason = self.risk_manager.check_execution_allowed()
        if not execution_allowed:
            return veto_reason
        return None
    
    async def process_market_data(self, h1_candles: list, m15_candles: list, m5_candles: list) -> Dict:
        """
        Process market data through filtration and strategy layers.
        
        Args:
            h1_candles: H1 timeframe candles
            m15_candles: M15 timeframe candles
            m5_candles: M5 timeframe candles
        
        Returns:
            Dictionary containing signal and filtration results
        """
        # Update regime layer
        if m15_candles:
            regime = self.regime_layer.detect_regime(m15_candles)
            self.risk_manager.update_regime(regime)
        
        # Prepare market snapshot for filtration
        market_snapshot = {
            "h1_candles": h1_candles,
            "m15_candles": m15_candles,
            "m5_candles": m5_candles,
            "active_zone": None  # Would be detected from supply/demand logic
        }
        
        # Run filtration
        filtration_result = None
        if self.filtration:
            try:
                filtration_result = self.filtration.process(market_snapshot)
            except Exception as e:
                print(f"[TradingLoop] Filtration error: {e}")
        
        # Generate signals from strategies
        signal = None
        if self.strategy_manager and m5_candles:
            try:
                signal = self.strategy_manager.generate_signal(m5_candles[-1])
            except Exception as e:
                print(f"[TradingLoop] Strategy error: {e}")
        
        return {
            "signal": signal,
            "filtration": filtration_result,
            "regime": self.regime_layer.current_regime if hasattr(self.regime_layer, 'current_regime') else None
        }
    
    async def execute_signal(self, signal: Dict, market_data: Dict, filtration_result: Optional[Dict] = None) -> bool:
        """
        Execute a trading signal if all checks pass.
        
        Args:
            signal: Trading signal dictionary
            market_data: Current market data
            filtration_result: Optional IGOF filtration result
        
        Returns:
            True if signal executed, False otherwise
        """
        if not signal:
            return False
        
        # Check IGOF Filtration (Active Blocking)
        from config.settings import ENABLE_IGOF
        if ENABLE_IGOF and filtration_result:
            if filtration_result.get("action") == "NO_TRADE":
                print(f"[TradingLoop] Signal BLOCKED by IGOF: {filtration_result.get('reason')}")
                if self.audit_logger:
                    self.audit_logger.log_event("IGOF", "SIGNAL_BLOCKED", filtration_result)
                return False
            else:
                print(f"[TradingLoop] IGOF Passed: {filtration_result.get('reason')}")
        
        # Check risk veto
        veto_reason = self.check_risk_veto()
        if veto_reason:
            print(f"[TradingLoop] Signal vetoed: {veto_reason}")
            return False
        
        # Check CRO rules (spread, liquidity)
        if not self.cro_rules.check_conditions(market_data):
            print(f"[TradingLoop] Signal failed CRO checks")
            return False
        
        # Execute via bridge
        if self.bridge and self.bridge.connected and not self.backtest_mode:
            try:
                result = self.bridge.send_signal(signal)
                if result:
                    print(f"[TradingLoop] Signal executed: {signal}")
                    if self.audit_logger:
                        self.audit_logger.log_trade(signal)
                    return True
            except Exception as e:
                print(f"[TradingLoop] Execution error: {e}")
        elif self.backtest_mode:
            print(f"[TradingLoop] [BACKTEST] Signal recorded: {signal}")
            return True
        
        return False
    
    async def run(self) -> None:
        """Main trading loop execution."""
        print("\n" + "="*60)
        print("TRADING LOOP STARTED")
        print("="*60 + "\n")
        
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    # 1. Fetch market data
                    h1_candles = await self.fetch_candle_data(session, "H1", 50)
                    m15_candles = await self.fetch_candle_data(session, "M15", 100)
                    m5_candles = await self.fetch_candle_data(session, "M5", 200)
                    
                    # 2. Update account balance periodically
                    await self.update_account_balance()
                    
                    # 3. Process market data
                    result = await self.process_market_data(h1_candles, m15_candles, m5_candles)
                    
                    # 4. Execute signal if present
                    if result.get("signal"):
                        await self.execute_signal(result["signal"], {
                            "h1_candles": h1_candles,
                            "m15_candles": m15_candles,
                            "m5_candles": m5_candles
                        }, filtration_result=result.get("filtration"))
                    
                    # 5. Sleep before next iteration
                    await asyncio.sleep(self.loop_interval)
                    
                except KeyboardInterrupt:
                    print("\n[TradingLoop] Shutdown requested")
                    break
                except Exception as e:
                    print(f"[TradingLoop] Error in main loop: {e}")
                    await asyncio.sleep(self.loop_interval)
