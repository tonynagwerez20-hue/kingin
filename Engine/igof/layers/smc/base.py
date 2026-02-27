import pandas as pd
import logging
from abc import ABC, abstractmethod
from typing import Dict, Tuple
from Engine.base_interfaces import BaseFiltrationLayer as IBaseFiltrationLayer

logger = logging.getLogger("SMCBase")

class SMCLayerBase(IBaseFiltrationLayer, ABC):
    """
    Abstract Base Class for modular SMC Filtration Layers.
    """
    def __init__(self, name: str = "SMC_Layer", threshold: float = 0.5, config: Dict = None):
        self.name = name
        self.threshold = threshold
        if config:
            self.name = config.get("name", self.name)
            self.threshold = config.get("threshold", self.threshold)
        
        super().__init__(config=config or {})

    @abstractmethod
    def validate(self, df: pd.DataFrame) -> Tuple[bool, float]:
        """
        Calculates institutional logic.
        Returns: (pass/fail, confidence_score)
        """
        pass

    def process(self, data: Dict) -> Dict:
        """
        IGOF Engine Compatibility Wrapper.
        """
        # Allow routing to different timeframes (H1, M15, M5, M1)
        tf_key = self.config.get("timeframe_key", "m5_candles")
        candles = data.get(tf_key, [])
        
        if not candles:
            return {"status": False, "reason": f"{self.name}: No {tf_key} data", "score": 0.0}
            
        df = pd.DataFrame(candles)
        status, score = self.validate(df)
        
        return {
            "status": status, 
            "reason": f"SMC {self.name}: {'Qualified' if status else 'Rejected'} (Score: {score:.2f})", 
            "score": score
        }
