import pandas as pd
import numpy as np
from typing import Tuple
from .base import SMCLayerBase

class MechanicalStructureLayer(SMCLayerBase):
    """
    Detects BOS (Break of Structure) and CHoCH (Change of Character).
    Logic: A Bullish BOS is confirmed only when a candle body closes above the last fractal swing high.
    """
    def validate(self, df: pd.DataFrame) -> Tuple[bool, float]:
        if len(df) < 10:
            return False, 0.0

        highs = df['high'].values
        # Fractal detection (5-candle)
        is_swing_high = (highs[2:-2] > highs[:-4]) & (highs[2:-2] > highs[1:-3]) & \
                        (highs[2:-2] > highs[3:-1]) & (highs[2:-2] > highs[4:])
        
        swing_high_indices = np.where(is_swing_high)[0] + 2
        if len(swing_high_indices) == 0:
            return False, 0.0
            
        last_swing_high = highs[swing_high_indices[-1]]
        last_close = df['close'].iloc[-1]
        
        status = last_close > last_swing_high
        score = 1.0 if status else 0.0
        return status, score
