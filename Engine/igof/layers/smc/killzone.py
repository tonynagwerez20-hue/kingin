from datetime import time, datetime
from typing import Tuple
import pandas as pd
from .base import SMCLayerBase

class KillzoneFilterLayer(SMCLayerBase):
    """
    Time-of-day filter.
    London: 07:00-10:00 UTC, NY: 12:00-15:00 UTC.
    """
    def validate(self, df: pd.DataFrame) -> Tuple[bool, float]:
        # Use the last candle's time for backtest accuracy
        if df.empty:
            return False, 0.0
            
        last_ts = df['time'].iloc[-1]
        
        # Get UTC offset from config (default to 0)
        utc_offset = self.config.get("utc_offset", 0)
        
        if hasattr(last_ts, 'time') and not isinstance(last_ts, (int, float)):
             # If it's a datetime object, assume it's broker time and subtract offset
             # This is a bit simplified, but works for the current MT5 implementation
             now_utc_dt = datetime.combine(datetime.today(), last_ts.time())
             ts_val = now_utc_dt.timestamp() - (utc_offset * 3600)
             now_utc = datetime.fromtimestamp(ts_val, tz=pd.Timestamp.now(tz='UTC').tzinfo).time()
        else:
             # Assume it's a unix timestamp (seconds). 
             # Subtract offset to convert Broker Epoch to true UTC Epoch
             effective_ts = float(last_ts) - (utc_offset * 3600)
             from datetime import timezone
             now_utc = datetime.fromtimestamp(effective_ts, tz=timezone.utc).time()
        
        london = (time(7, 0) <= now_utc <= time(10, 0))
        ny = (time(12, 0) <= now_utc <= time(15, 0))
        
        status = london or ny
        score = 1.0 if status else 0.0
        return status, score
