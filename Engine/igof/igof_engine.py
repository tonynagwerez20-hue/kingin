from typing import List, Dict, Optional
import logging
from ..base_interfaces import BaseFiltrationLayer

logger = logging.getLogger("IGOFEngine")

class IGOFEngine:
    """
    Modular Filtration Engine that orchestrates multiple plug-and-play layers.
    No longer hardcoded - accepts a list of Layer instances.
    """
    def __init__(self, layers: List[BaseFiltrationLayer]):
        """
        Initialize the engine with a list of filtration layers.
        
        Args:
            layers: List of objects implementing BaseFiltrationLayer.
        """
        self.layers = layers
        logger.info(f"IGOFEngine initialized with {len(self.layers)} layers.")

    def process_all_layers(self, market_snapshot: Dict) -> Dict:
        """
        Execute ALL registered layers sequentially. 
        Returns NO_TRADE if any layer fails.
        """
        results = []
        
        # Helper: ensure current_time is available for layers that need it
        if "current_time" not in market_snapshot and "m5_candles" in market_snapshot:
            if market_snapshot["m5_candles"]:
                market_snapshot["current_time"] = market_snapshot["m5_candles"][-1].get("time")

        for layer in self.layers:
            try:
                res = layer.process(market_snapshot)
                results.append({
                    "layer": layer.__class__.__name__,
                    "result": res
                })
                
                if not res.get("status", False):
                    logger.info(f"Trade filtered by {layer.__class__.__name__}: {res.get('reason', 'Filtered')}")
                    return {
                        "action": "NO_TRADE", 
                        "reason": f"{layer.__class__.__name__}: {res.get('reason', 'Filtered')}",
                        "layer_results": results
                    }
            except Exception as e:
                logger.error(f"Error processing layer {layer.__class__.__name__}: {e}")
                return {
                    "action": "NO_TRADE",
                    "reason": f"System Error in layer {layer.__class__.__name__}",
                    "layer_results": results
                }
        
        logger.info("All layers passed. Trade allowed.")
        return {
            "action": "TRADE_ALLOWED", 
            "reason": "All Layers Passed", 
            "layer_results": results
        }

    # Helper kept for legacy/compatibility if needed by other components
    def calculate_stop_loss(self, m5_candles: List[Dict], direction: str, buffer: float = 0.02) -> Optional[float]:
        """
        Generic SL calculation logic based on volatility/extremums.
        """
        if len(m5_candles) < 10:
            return None
        
        # Default lookback
        lookback = 5
        
        prev_min = min(c['low'] for c in m5_candles[-(lookback+1):-1])
        prev_max = max(c['high'] for c in m5_candles[-(lookback+1):-1])
        
        if direction == "LONG":
            return prev_min - buffer
        elif direction == "SHORT":
            return prev_max + buffer
        
        return None
