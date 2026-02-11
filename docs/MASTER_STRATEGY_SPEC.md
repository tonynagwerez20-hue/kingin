# Master Strategy & Technical Specification v6.0

## 1. Core Architecture: Triple-TF Hierarchical Alignment
The system follows a strict "H1 Bias -> M15 Context -> M5 Execution" protocol. No layer may be skipped.

### A. Filter One: HTF Structural Bias (H1)
- **Timeframe**: H1 (1-Hour)
- **Function**: Determines the primary directional bias for the day.
- **Logic**: Uses market structure (Break of Structure/EMA) to define BULLISH or BEARISH regime.
- **Rule**: Trades are only permitted in the direction of the H1 bias.

### B. Filter Two: MTF Strategic Context (M15)
- **Timeframe**: M15 (15-Minute)
- **Function**: Identifies high-probability Supply and Demand zones.
- **Logic**: Automatically detects and mitigates zones based on price action.
- **Rule**: Price must be inside a validated M15 zone to authorize an entry.

### C. Trigger Layer: LTF Execution (M5)
- **Timeframe**: M5 (5-Minute)
- **Function**: Precision entry and risk management.
- **Logic**: Uses Candlestick Patterns and Orderflow Delta.
- **Rule**: Entry signal must align with H1 and M15 direction.

## 2. Technical Optimization: ZMQ Pipeline
To maintain sub-second execution speeds, the system utilizes an optimized ZeroMQ tunnel.

### A. Latency Management (CONFLATE)
- **Option**: `zmq.CONFLATE` is enabled on the market data SUB socket.
- **Result**: Eliminates buffer bloat by discarding stale messages, ensuring the strategy engine always processes the latest price tick.
- **Target**: 0ms queue latency.

### B. Signal Execution
- **Pattern**: PUB/SUB for signals, REQ/REP for execution acknowledgments.
- **Ports**: 
    - 5555: PUB (Signals to EA)
    - 5557: REQ (Command/Balance Sync with EA)
    - 5556: SUB (DTC/Sierra Market Data)

## 3. Risk & Validation
- **Global Kill Switch**: Monitored via `risk_state.json`.
- **Slippage Tolerance**: Dynamic spread audits via `CRO_Rules`.
- **Audit Logging**: Every decision (PASS, VETO, EXIT) is logged with a JSON context for post-trade analysis.
