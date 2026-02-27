import pandas as pd
from typing import Tuple
from .base import SMCLayerBase

class LiquiditySweepLayer(SMCLayerBase):
    """
    Identifies 'Purge and Revert.'
    Logic: Calculates PDH/PDL. Validates if current candle wicked beyond them but closed inside.
    """
    def validate(self, df: pd.DataFrame) -> Tuple[bool, float]:
        lookback = 288 # Approx 24h for M5
        if len(df) < lookback + 1:
            return False, 0.0
            
        pdh = df['high'].iloc[-lookback:-1].max()
        pdl = df['low'].iloc[-lookback:-1].min()
        
        curr_high = df['high'].iloc[-1]
        curr_low = df['low'].iloc[-1]
        curr_close = df['close'].iloc[-1]
        
        bull_sweep = (curr_low < pdl) and (curr_close > pdl)
        bear_sweep = (curr_high > pdh) and (curr_close < pdh)
        
        status = bull_sweep or bear_sweep
        score = 1.0 if status else 0.0
        return status, score
