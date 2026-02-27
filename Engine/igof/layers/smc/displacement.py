import pandas as pd
import numpy as np
from typing import Tuple
from .base import SMCLayerBase

class DisplacementLayer(SMCLayerBase):
    """
    Measures Institutional Urgency.
    Logic: Candle body size must be > 1.5x ATR(20).
    """
    def validate(self, df: pd.DataFrame) -> Tuple[bool, float]:
        if len(df) < 21:
            return False, 0.0
            
        highs = df['high']
        lows = df['low']
        closes = df['close']
        
        tr = np.maximum(highs - lows, 
                        np.maximum(np.abs(highs - closes.shift(1)), 
                                  np.abs(lows - closes.shift(1))))
        atr = tr.iloc[-21:-1].mean()
        
        curr_body = abs(df['close'].iloc[-1] - df['open'].iloc[-1])
        ratio = curr_body / atr if atr > 0 else 0
        
        status = ratio >= self.threshold # Default to 1.5
        score = min(ratio / 2.0, 1.0)
        return status, score
