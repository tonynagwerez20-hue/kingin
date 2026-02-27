import pandas as pd
from typing import Tuple
from .base import SMCLayerBase

class FVGDiscountLayer(SMCLayerBase):
    """
    Detects Fair Value Gaps and Premium/Discount zones.
    Logic: Identifies 3-candle imbalances. Calculates 50% equilibrium.
    """
    def validate(self, df: pd.DataFrame) -> Tuple[bool, float]:
        if len(df) < 20:
            return False, 0.0
            
        c1_high, c1_low = df['high'].iloc[-3], df['low'].iloc[-3]
        c3_high, c3_low = df['high'].iloc[-1], df['low'].iloc[-1]
        
        fvg_up = c3_low > c1_high
        fvg_down = c3_high < c1_low
        
        if not (fvg_up or fvg_down):
            return False, 0.0
            
        max_h = df['high'].iloc[-20:].max()
        min_l = df['low'].iloc[-20:].min()
        equilibrium = (max_h + min_l) / 2
        
        curr_price = df['close'].iloc[-1]
        is_discount = curr_price < equilibrium
        is_premium = curr_price > equilibrium
        
        status = (fvg_up and is_discount) or (fvg_down and is_premium)
        score = 0.8 if status else 0.0
        return status, score
