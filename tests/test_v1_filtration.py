import sys
from pathlib import Path
import unittest

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from Engine.igof.v1_engine import V1FiltrationEngine

class TestV1Filtration(unittest.TestCase):
    def setUp(self):
        self.engine = V1FiltrationEngine()

    def test_h1_bias_calculation(self):
        # Mock candles for BOS + Displacement + Imbalance (Score 3)
        candles = [
            {"open": 1990, "high": 1995, "low": 1985, "close": 1992, "time": -7200},
            {"open": 1992, "high": 1998, "low": 1990, "close": 1997, "time": -3600},
            {"open": 2000, "high": 2005, "low": 1995, "close": 2002, "time": 0},
            {"open": 2002, "high": 2007, "low": 2001, "close": 2005, "time": 3600},
            {"open": 2005, "high": 2015, "low": 2005, "close": 2014, "time": 7200}, # Strong displacement
        ]
        score = self.engine.calculate_h1_bias(candles)
        print(f"H1 Bias Score: {score}")
        self.assertGreaterEqual(score, 1)

    def test_zone_scoring(self):
        zone = {"type": "demand", "low": 2000, "high": 2005, "index": 0, "mitigated": False, "volume_spike": True}
        h1_candles = [
            {"open": 2000, "high": 2005, "low": 1995, "close": 2002, "time": 0},
            {"open": 2002, "high": 2010, "low": 2002, "close": 2009, "time": 3600}, # Strong departure
        ]
        self.engine.h1_bias_score = 2
        score = self.engine.score_zone(zone, h1_candles)
        print(f"Zone Quality Score: {score}")
        self.assertGreaterEqual(score, 3)

    def test_full_process_mock(self):
        snapshot = {
            "h1_candles": [{"open": 2000, "high": 2015, "low": 1995, "close": 2014, "time": 0}] * 10,
            "m5_candles": [{"open": 2010, "high": 2012, "low": 2008, "close": 2011, "time": 0}] * 10,
            "active_zone": {"type": "demand", "index": 5, "mitigated": False, "volume_spike": True}
        }
        # Inject custom methods to test flow
        self.engine.calculate_h1_bias = lambda x, t=None: 3
        self.engine.score_zone = lambda x, y: 5
        self.engine.check_liquidity_event = lambda x: True
        self.engine.check_microstructure_shift = lambda x: True
        self.engine.validate_displacement = lambda x: True
        
        res = self.engine.process_all_layers(snapshot)
        print(f"Process Result: {res}")
        self.assertEqual(res["action"], "TRADE_ALLOWED")

if __name__ == "__main__":
    unittest.main()
