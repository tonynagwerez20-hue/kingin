# System Backtesting Guide

This guide explains how to validate the system using historical data replay.

## Option 1: DTC Replay (Recommended)
This mode connects to Sierra Chart's "Replay" feature. It mimics live trading exactly, including order execution (simulated by Sierra Chart) and market data updates.

### Prerequisites
1.  **Sierra Chart** must be installed and running.
2.  **DTC Server** must be enabled in Sierra Chart (`Global Settings` -> `DTC Server Settings` -> Enable Server 1 on port 11099).

### Steps
1.  **Prepare Sierra Chart for Replay**:
    *   Open your chart (e.g., XAUUSD).
    *   Go to `Edit` -> `Replay Chart` (Ctrl+Shift+R).
    *   Select your Start Date/Time.
    *   Set **Replay Speed** (e.g., 10x or 100x for verification, 1x for realistic testing).
    *   **CRITICAL**: Ensure `Trade` -> `Trade Simulation Mode On` is CHECKED.

2.  **Start the System**:
    Open a terminal in the project root and run:
    ```bash
    python run_backtest.py --mode=DTC
    ```

3.  **Start Replay in Sierra Chart**:
    *   Press the **Play** button in the Replay Control Panel in Sierra Chart.

4.  **Monitor**:
    *   The console will show `[SIGNAL]` logs when trades ideally would occur.
    *   Since `--backtest` flag is used, the system will **NOT** send orders to MT5. It will record them to `data/backtest_signals.csv`.
    *   The `server.py` window (if separate) will show data flowing.

## Option 2: CSV Replay
This mode uses local text files (`data_feed/sierra_*.txt`) to simulate data.

### Steps
1.  Ensure data files exist in `data_feed/`.
2.  Run:
    ```bash
    python run_backtest.py --mode=CSV
    ```

## Outputs
- **Console**: Real-time log of strategy logic.
- **Signals**: Saved to `data/backtest_signals.csv`.
- **Logs**: Detailed logs in `engine_backtest.log` (if configured).
