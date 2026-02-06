# Trading on MT5 - Simplified Setup Guide

## ✅ Good News!

If you're **executing trades on MT5** (not Sierra Chart), you can **ignore the NTP Error 1314**. 

Sierra Chart is only used for **data feed** in your system. The NTP sync error won't affect:
- ✅ Market data reception
- ✅ Trade execution (handled by MT5)
- ✅ Dashboard updates
- ✅ Strategy signals

---

## What You Actually Need

### 1. Sierra Chart (Data Feed Only)

**Purpose**: Receive real-time market data via DTC protocol

**What's Required**:
- ✅ DTC Protocol Server enabled
- ✅ Connection to data feed (ports 11099, 11098)
- ❌ **NOT required**: Administrator rights
- ❌ **NOT required**: NTP sync
- ❌ **NOT required**: Trading enabled in Sierra Chart

**Why NTP Error is OK**:
- NTP sync only matters if Sierra Chart is sending orders to a broker
- Since you're using MT5 for execution, Sierra Chart just needs to receive data
- Data timestamps come from the feed server, not your local clock

---

### 2. MetaTrader 5 (Trade Execution)

**Purpose**: Execute all buy/sell orders

**What's Required**:
- ✅ Algo Trading enabled (green button)
- ✅ DLL imports allowed
- ✅ ZMQ Bridge EA running (smiley face 🙂)
- ✅ Connected to broker account

**This is your critical component for trading!**

---

## Simplified Startup (MT5 Execution Mode)

### Step 1: Start Sierra Chart (Normal Mode)
```
Just double-click SierraChart_64.exe
No need for "Run as Administrator"
```

**Verify**:
- DTC server shows "Listening on port 11099"
- You can ignore the NTP error message

### Step 2: Start MetaTrader 5
```
1. Open MT5
2. Enable "Algo Trading" (green)
3. Attach ZMQ Bridge EA to chart
4. Verify smiley face 🙂
```

### Step 3: Start Python System
```powershell
# Terminal 1: Data Feed
cd e:\s.y.s.t.e.m
python data_feed/server.py

# Terminal 2: Trading Engine
cd e:\s.y.s.t.e.m
python Engine/main_loop.py

# Terminal 3: Dashboard
cd e:\s.y.s.t.e.m
streamlit run dashboard/dashboard_app.py
```

---

## How It Works

```
Sierra Chart (Data) → Python Engine (Signals) → MT5 (Execution)
     ↓                      ↓                        ↓
  DTC Feed            Strategy Logic           Real Trades
```

**Data Flow**:
1. Sierra Chart receives market data from broker/feed
2. Python engine analyzes data and generates signals
3. MT5 executes trades via ZMQ bridge
4. Dashboard shows everything in real-time

---

## If NTP Error Bothers You (Optional Fix)

If you want to remove the error message from Sierra Chart logs:

### Option A: Run as Administrator (One-Time Setup)
1. Right-click `SierraChart_64.exe`
2. Select "Properties"
3. Go to "Compatibility" tab
4. ✅ Check "Run this program as an administrator"
5. Click OK

Now Sierra Chart will always run with admin rights when you double-click it.

### Option B: Disable NTP Sync
1. In Sierra Chart: `Global Settings` → `General Settings`
2. Find "NTP Time Synchronization"
3. Uncheck "Enable NTP Time Synchronization"
4. Click OK

This stops Sierra Chart from trying to sync time (and stops the error).

---

## Verify Your Setup

Run the diagnostic:
```powershell
python tests/diag_system_health.py
```

**Expected for MT5 Execution Mode**:
```
✅ DTC Live Port (11099): REACHABLE
⚠️  DTC Login: SUCCESS (TradingIsSupported: 0 is OK)
✅ MT5 Bridge: CONNECTED
✅ Account Balance: $10,000.00
✅ API Status: DTC
✅ Latest Price: 2654.75
```

**Note**: `TradingIsSupported: 0` is **fine** because you're not trading through Sierra Chart!

---

## What Actually Matters for Trading

| Component | Status Needed | Why |
|-----------|--------------|-----|
| **Sierra Chart DTC** | Connected | Provides market data |
| **MT5 Bridge** | Connected | Executes your trades |
| **MT5 Algo Trading** | Enabled | Allows EA to run |
| **Python Engine** | Running | Generates signals |

**Not Critical**:
- ❌ Sierra Chart admin rights
- ❌ NTP sync
- ❌ Sierra Chart trading enabled
- ❌ Windows Firewall (if using localhost)

---

## Troubleshooting

### "Still seeing Error 1314 in logs"
**Answer**: Ignore it! It doesn't affect data reception or MT5 execution.

### "Want to remove the error message"
**Answer**: Use Option A or B above to stop the NTP sync attempts.

### "Data not flowing to Python"
**Check**:
1. Sierra Chart shows "Conn" (connected to feed)
2. DTC server is listening on port 11099
3. Python shows `[DTC] LIVE Logon Success`

### "Trades not executing"
**Check**:
1. MT5 Algo Trading is GREEN
2. EA shows smiley face 🙂
3. Python shows `✅ [Pre-Flight] MT5 Bridge: CONNECTED`

---

## Summary

For **MT5 execution mode**:
- ✅ Sierra Chart: Just needs to receive data (no admin rights needed)
- ✅ MT5: Handles all trade execution (this is critical)
- ✅ Python: Connects both and runs strategy

**You can safely ignore Error 1314** - it won't affect your trading!
