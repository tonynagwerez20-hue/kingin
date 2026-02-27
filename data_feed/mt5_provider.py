import MetaTrader5 as mt5
import pandas as pd
import logging
from typing import Optional, Dict
from datetime import datetime
from .base_provider import BaseDataProvider

logger = logging.getLogger("MT5Provider")

class MT5DataProvider(BaseDataProvider):
    """
    MT5 Implementation of the modular Data Provider.
    """
    
    TIMEFRAME_MAP = {
        "M1": mt5.TIMEFRAME_M1,
        "M5": mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15,
        "M30": mt5.TIMEFRAME_M30,
        "H1": mt5.TIMEFRAME_H1,
        "H4": mt5.TIMEFRAME_H4,
        "D1": mt5.TIMEFRAME_D1
    }

    def __init__(self, config: Dict):
        self.login = config.get("login")
        self.password = config.get("password")
        self.server = config.get("server")
        self.lite_mode = config.get("lite_mode", False)

    def connect(self) -> bool:
        # Strict parameterized initialization (using config credentials ONLY)
        if not self.login:
            logger.error("No MT5 login provided in configuration. Strict login required.")
            return False

        logger.info(f"Attempting strict login to account {self.login} on {self.server}...")
        
        # 1. Initialize terminal first (shared session)
        if not mt5.initialize():
            logger.error(f"MT5 Terminal initialization failed: {mt5.last_error()}")
            return False
            
        # 2. Explicitly log in to ensure account switch
        login_res = mt5.login(login=int(self.login), password=self.password, server=self.server)
        
        if login_res:
            acc_info = mt5.account_info()
            if acc_info and acc_info.login == int(self.login):
                logger.info(f"MT5 Login Successful. Account: {acc_info.login}, Server: {acc_info.server}")
                return True
            else:
                current = acc_info.login if acc_info else 'None'
                logger.error(f"MT5 Login claimed success but account is {current}, not {self.login}")
                return False
        else:
            logger.error(f"MT5 Login failed for account {self.login}: {mt5.last_error()}")
            return False

    def is_connected(self) -> bool:
        ti = mt5.terminal_info()
        return ti.connected if ti else False

    def get_latest_candles(self, symbol: str, timeframe: str, count: int) -> list:
        mt5_tf = self.TIMEFRAME_MAP.get(timeframe, mt5.TIMEFRAME_M5)
        
        # Ensure symbol is selected and synced
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            logger.error(f"Symbol {symbol} not found in terminal.")
            return []
            
        if not symbol_info.visible:
            if not mt5.symbol_select(symbol, True):
                logger.error(f"Failed to select symbol {symbol}: {mt5.last_error()}")
                return []
        
        rates = mt5.copy_rates_from_pos(symbol, mt5_tf, 0, count)
        if rates is None or len(rates) == 0:
            err = mt5.last_error()
            logger.warning(f"No history found for {symbol} on {timeframe}. MT5 Error: {err}")
            return []

        df = pd.DataFrame(rates)
        # Keep time as unix integer for JSON serialization
        df['time'] = df['time'].astype(int)
        
        # Standardize for the pipeline
        return df.to_dict('records')

    def get_live_ticks(self, symbol: str) -> pd.DataFrame:
        """
        Fetch latest 10 ticks and convert to 'mini-candles' for stitching.
        """
        ticks = mt5.copy_ticks_from(symbol, datetime.now(), 10, mt5.COPY_TICKS_ALL)
        if ticks is None or len(ticks) == 0:
            return pd.DataFrame()
            
        df = pd.DataFrame(ticks)
        # Note: In a real-world scenario, we'd aggregate these ticks 
        return df

    def get_tick_data(self, symbol: str) -> Dict:
        """
        Fetch the absolute latest tick (bid/ask).
        """
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            return {"bid": 0.0, "ask": 0.0, "time": datetime.now().timestamp()}
            
        return {
            "bid": tick.bid,
            "ask": tick.ask,
            "time": tick.time
        }

    def get_account_info(self) -> Dict:
        """
        Fetch current account balance and equity.
        """
        acc = mt5.account_info()
        if acc is None:
            logger.warning("MT5 account_info() returned None. Check terminal connection.")
            return {"balance": 0.0, "equity": 0.0}
        
        return {
            "balance": acc.balance,
            "equity": acc.equity,
            "login": acc.login,
            "server": acc.server
        }

    def shutdown(self):
        mt5.shutdown()
