import pandas as pd
import numpy as np
from typing import List, Dict, Optional
import time

class V1FiltrationEngine:
    def __init__(self):
        self.h1_bias_score = 0
        self.zones = []
        self.session_active = False

    def calculate_h1_bias(self, h1_candles: List[Dict]) -> int:
        """
        Layer 1: H1 Structural Bias Engine
        Optimized to use lists for speed.
        """
        if len(h1_candles) < 5:
            return 0
        
        # Current and previous candles
        c1 = h1_candles[-1] # Current
        c2 = h1_candles[-2] # Prev
        c3 = h1_candles[-3] # Prev-Prev
        
        # 1. Break of Structure (BOS)
        # Check if current close breaks previous fractal
        bos = False
        if c1['close'] > c2['high'] or c1['close'] < c2['low']:
            bos = True
            
        # 2. Displacement Strength
        # Spread of the last candle vs average
        last_spread = abs(c1['close'] - c1['open'])
        # Simplified context check: compare to average of last 5
        avg_spread = sum(abs(c['close'] - c['open']) for c in h1_candles[-6:-1]) / 5
        displacement = last_spread > avg_spread * 1.5
        
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
            if spread > 1.0: # Adjusted for ES/Gold general use
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
        
        # Sweep of previous 5 candles' low/high
        prev_min = min(c['low'] for c in candles[-6:-1])
        prev_max = max(c['high'] for c in candles[-6:-1])
        
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
            if spread > 0.5: # M5 specific displacement
                return True
                
        return False

    def validate_displacement(self, candle: Dict) -> bool:
        """
        Layer 5: Displacement Validation
        Large body, minimal overlap, increased volume.
        """
        spread = abs(candle['close'] - candle['open'])
        body_to_wick_ratio = spread / (candle['high'] - candle['low'] + 0.001)
        
        if body_to_wick_ratio > 0.6 and spread > 0.5:
            return True
        return False

    def process_all_layers(self, market_snapshot: Dict) -> Dict:
        """
        Execute ALL layers. Return NO_TRADE if any fail.
        """
        h1_candles = market_snapshot.get("h1_candles", [])
        m5_candles = market_snapshot.get("m5_candles", [])
        active_zone = market_snapshot.get("active_zone")
        
        # Layer 1
        bias_score = self.calculate_h1_bias(h1_candles)
        if bias_score < 2:
            return {"action": "NO_TRADE", "reason": f"L1: HTF Bias Weak ({bias_score})"}
            
        # Layer 2
        if not active_zone:
            return {"action": "NO_TRADE", "reason": "L2: No active zone detected"}
        zone_score = self.score_zone(active_zone, h1_candles)
        if zone_score < 3:
            return {"action": "NO_TRADE", "reason": f"L2: Zone Quality Low ({zone_score})"}
            
        # Layer 3
        if not self.check_liquidity_event(m5_candles):
            return {"action": "NO_TRADE", "reason": "L3: No Liquidity Event"}
            
        # Layer 4 & 5
        if not self.check_microstructure_shift(m5_candles):
            return {"action": "NO_TRADE", "reason": "L4: No Microstructure Shift"}
            
        if not self.validate_displacement(m5_candles[-1]):
            return {"action": "NO_TRADE", "reason": "L5: Weak Displacement"}
            
        return {"action": "TRADE_ALLOWED", "reason": "All Layers Passed", "bias": bias_score, "zone_score": zone_score}
