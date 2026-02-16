import pandas as pd
import numpy as np
from typing import List, Dict, Optional
import time
import json
from pathlib import Path

class V1FiltrationEngine:
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize V1 Filtration Engine with externalized configuration.
        
        Args:
            config_path: Path to trading_params.json. If None, uses default location.
        """
        self.h1_bias_score = 0
        self.zones = []
        self.session_active = False
        
        # Load configuration
        if config_path is None:
            config_path = Path(__file__).parent.parent.parent / "config" / "trading_params.json"
        
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Extract IGOF parameters
        self.layer1_config = config.get("igof_v1", {}).get("layer1_h1_bias", {})
        self.layer2_config = config.get("igof_v1", {}).get("layer2_zone_quality", {})
        self.layer3_config = config.get("igof_v1", {}).get("layer3_liquidity", {})
        self.layer4_config = config.get("igof_v1", {}).get("layer4_microstructure", {})
        self.layer5_config = config.get("igof_v1", {}).get("layer5_displacement", {})
        
        # Session filter
        self.session_config = config.get("session_filter", {})

    def calculate_h1_bias(self, h1_candles: List[Dict], current_time: Optional[int] = None) -> int:
        """
        Layer 1: H1 Structural Bias Engine
        Optimized to use lists for speed.
        
        HYBRID FILTRATION: Only validates BOS/Displacement if H1 candle is in final 5 minutes.
        """
        if len(h1_candles) < 5:
            return 0
        
        # Current and previous candles
        c1 = h1_candles[-1] # Current (developing)
        c2 = h1_candles[-2] # Prev
        c3 = h1_candles[-3] # Prev-Prev
        
        # HYBRID FILTER: Check candle maturity (last 5 minutes of H1 = 55+ minutes elapsed)
        # H1 = 3600 seconds. If current_time is provided, check elapsed time.
        candle_mature = True  # Default to True for backtesting compatibility
        if current_time:
            candle_start = c1.get('time', 0)
            elapsed = current_time - candle_start
            # Use config value for maturity threshold
            maturity_threshold = self.layer1_config.get('candle_maturity_seconds', 3300)
            if elapsed < maturity_threshold:
                candle_mature = False
        
        # 1. Break of Structure (BOS)
        # Check if current close breaks previous fractal
        bos = False
        if candle_mature and (c1['close'] > c2['high'] or c1['close'] < c2['low']):
            bos = True
            
        # 2. Displacement Strength
        # Spread of the last candle vs average
        last_spread = abs(c1['close'] - c1['open'])
        # Simplified context check: compare to average of last 5
        avg_spread = sum(abs(c['close'] - c['open']) for c in h1_candles[-6:-1]) / 5
        displacement_multiplier = self.layer1_config.get('displacement_multiplier', 1.5)
        displacement = candle_mature and (last_spread > avg_spread * displacement_multiplier)
        
        # 3. Imbalance (FVG)
        imbalance = False
        # Bullish FVG: Current Low > 2nd-prev High
        if c1['low'] > c3['high']:
            imbalance = True
        # Bearish FVG: Current High < 2nd-prev Low
        elif c1['high'] < c3['low']:
            imbalance = True

        # Scoring
        score = 0
        if bos: score += 1
        if displacement: score += 1
        if imbalance: score += 1
        
        self.h1_bias_score = score
        return score

    def score_zone(self, zone: Dict, h1_candles: List[Dict]) -> int:
        """
        Layer 2: Zone Quality Engine (0-5)
        """
        score = 0
        if not zone: return 0
        
        # 1. Freshness
        if not zone.get("mitigated", False):
            score += 1
            
        # 2. Strong impulse departure
        idx = zone.get("index", -1)
        # Backtest optimization: index might not be absolute
        if idx != -1 and idx < len(h1_candles) - 1:
            departure_candle = h1_candles[idx + 1]
            spread = abs(departure_candle['close'] - departure_candle['open'])
            impulse_threshold = self.layer2_config.get('impulse_departure_threshold', 1.0)
            if spread > impulse_threshold:
                score += 1
        
        # 3. Volume expansion
        if zone.get("volume_spike", False):
            score += 1
            
        # 4. Liquidity sweep
        if zone.get("sweep", False):
            score += 1
            
        # 5. HTF alignment
        if self.h1_bias_score >= 2:
            score += 1
            
        return score

    def check_liquidity_event(self, candles: List[Dict]) -> bool:
        """
        Layer 3: Liquidity Event Confirmation
        """
        if len(candles) < 10:
            return False
            
        last_low = candles[-1]['low']
        last_high = candles[-1]['high']
        
        # Sweep of previous N candles' low/high (configurable)
        lookback = self.layer3_config.get('sweep_lookback_candles', 5)
        prev_min = min(c['low'] for c in candles[-(lookback+1):-1])
        prev_max = max(c['high'] for c in candles[-(lookback+1):-1])
        
        if last_low < prev_min or last_high > prev_max:
            return True
            
        return False

    def check_microstructure_shift(self, candles: List[Dict]) -> bool:
        """
        Layer 4: Microstructure Shift (M1/M5)
        Look for mBOS, Displacement candle, Close beyond structure.
        """
        if len(candles) < 3:
            return False
            
        # Simplified mBOS: current close breaks prev candle high/low with displacement
        curr = candles[-1]
        prev = candles[-2]
        
        if curr['close'] > prev['high'] or curr['close'] < prev['low']:
            # Check displacement (big body)
            spread = abs(curr['close'] - curr['open'])
            displacement_threshold = self.layer4_config.get('displacement_threshold', 0.5)
            if spread > displacement_threshold:
                return True
                
        return False

    
    def check_session_active(self, current_time: Optional[int] = None) -> bool:
        """
        Session Filter: Only trade during London + NY sessions (08:00-21:00 UTC).
        
        Args:
            current_time: Unix timestamp. If None, uses system time.
        
        Returns:
            True if within trading session, False otherwise.
        """
        if not self.session_config.get('enabled', True):
            return True  # Filter disabled
        
        from datetime import datetime, timezone
        if current_time:
            dt = datetime.fromtimestamp(current_time, tz=timezone.utc)
        else:
            dt = datetime.now(timezone.utc)
        
        hour_utc = dt.hour
        start_hour = self.session_config.get('start_hour_utc', 8)
        end_hour = self.session_config.get('end_hour_utc', 21)
        
        return start_hour <= hour_utc < end_hour
    
    def calculate_stop_loss(self, m5_candles: List[Dict], direction: str) -> Optional[float]:
        """
        Calculate Stop Loss placement: 2 pips below liquidity event (for longs) or above (for shorts).
        
        Args:
            m5_candles: M5 candle data
            direction: "LONG" or "SHORT"
        
        Returns:
            SL price level, or None if insufficient data
        """
        if len(m5_candles) < 10:
            return None
        
        # Find the liquidity event (sweep of previous candles)
        lookback = self.layer3_config.get('sweep_lookback_candles', 5)
        prev_min = min(c['low'] for c in m5_candles[-(lookback+1):-1])
        prev_max = max(c['high'] for c in m5_candles[-(lookback+1):-1])
        
        # SL buffer from config (default 2 pips = 0.02 for Gold)
        sl_buffer = 0.02  # This should come from config in production
        
        if direction == "LONG":
            # SL below the liquidity sweep low
            return prev_min - sl_buffer
        elif direction == "SHORT":
            # SL above the liquidity sweep high
            return prev_max + sl_buffer
        
        return None

    def validate_displacement(self, candle: Dict) -> bool:
        """
        Layer 5: Displacement Validation
        Large body, minimal overlap, increased volume.
        """
        spread = abs(candle['close'] - candle['open'])
        body_to_wick_ratio = spread / (candle['high'] - candle['low'] + 0.001)
        
        min_ratio = self.layer5_config.get('body_to_wick_ratio', 0.6)
        min_spread = self.layer5_config.get('min_spread', 0.5)
        if body_to_wick_ratio > min_ratio and spread > min_spread:
            return True
        return False

    def process_all_layers(self, market_snapshot: Dict) -> Dict:
        """
        Execute ALL layers. Return NO_TRADE if any fail.
        """
        h1_candles = market_snapshot.get("h1_candles", [])
        m5_candles = market_snapshot.get("m5_candles", [])
        active_zone = market_snapshot.get("active_zone")
        
        # Extract current time from latest M5 candle for maturity check
        current_time = None
        if m5_candles:
            current_time = m5_candles[-1].get('time')
        
        # Session Filter (Critical from Trader Panel)
        if not self.check_session_active(current_time):
            return {"action": "NO_TRADE", "reason": "Outside trading session (08:00-21:00 UTC)"}
        
        # Layer 1 (with Hybrid Filtration)
        bias_score = self.calculate_h1_bias(h1_candles, current_time)
        min_bias = self.layer1_config.get('min_score', 2)
        if bias_score < min_bias:
            return {"action": "NO_TRADE", "reason": f"L1: HTF Bias Weak ({bias_score}/{min_bias})"}
            
        # Layer 2
        if not active_zone:
            return {"action": "NO_TRADE", "reason": "L2: No active zone detected"}
        zone_score = self.score_zone(active_zone, h1_candles)
        min_zone = self.layer2_config.get('min_score', 3)
        if zone_score < min_zone:
            return {"action": "NO_TRADE", "reason": f"L2: Zone Quality Low ({zone_score}/{min_zone})"}
            
        # Layer 3
        if not self.check_liquidity_event(m5_candles):
            return {"action": "NO_TRADE", "reason": "L3: No Liquidity Event"}
            
        # Layer 4 & 5
        if not self.check_microstructure_shift(m5_candles):
            return {"action": "NO_TRADE", "reason": "L4: No Microstructure Shift"}
            
        if not self.validate_displacement(m5_candles[-1]):
            return {"action": "NO_TRADE", "reason": "L5: Weak Displacement"}
            
        return {"action": "TRADE_ALLOWED", "reason": "All Layers Passed", "bias": bias_score, "zone_score": zone_score}
