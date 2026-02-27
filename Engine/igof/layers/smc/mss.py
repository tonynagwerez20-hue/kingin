import pandas as pd
from typing import Tuple
from .base import SMCLayerBase

class MicroMSSLayer(SMCLayerBase):
    """
    M5/M1 timeframe confirmation shift.
    Logic: Looks for minor market structure shift.
    """
    def validate(self, df: pd.DataFrame) -> Tuple[bool, float]:
        if len(df) < 5:
            return False, 0.0
            
        last_close = df['close'].iloc[-1]
        prev_high = df['high'].iloc[-3:-1].max()
        prev_low = df['low'].iloc[-3:-1].min()
        
        status = (last_close > prev_high) or (last_close < prev_low)
        score = 0.7 if status else 0.0
        return status, score
