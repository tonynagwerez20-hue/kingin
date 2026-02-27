import numpy as np
from typing import List, Dict

class RegimeLayer:
    def __init__(self, volatility_threshold: float = 2.0):
        self.volatility_threshold = volatility_threshold

    def detect_regime(self, ltf_buffer: List[Dict]) -> str:
        """
        Detects market regime based on recent volatility.
        Returns 'STABLE' or 'VOLATILE'.
        """
        if len(ltf_buffer) < 10:
            return "STABLE"

        # Calculate standard deviation of returns
        closes = [c["close"] for c in ltf_buffer[-10:]]
        returns = np.diff(closes)
        vol = np.std(returns)

        if vol > self.volatility_threshold:
            return "VOLATILE"
        
        return "STABLE"
