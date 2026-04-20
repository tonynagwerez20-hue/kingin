# KingIn Institutional Trading System

Professional SMC/ICT trading control room for MetaTrader 5, with a Python trading engine, local API server, and React dashboard.

This `master` branch is set up for Windows desktop use as a local app: the Python backend runs on your machine, the React dashboard opens in your browser at `http://localhost:5000`, and MetaTrader 5 handles live broker connectivity/execution.

## What is included

- Python trading engine in `Engine/`
- MT5/data-feed modules in `data_feed/` and `execution/`
- FastAPI dashboard bridge in `kingin_api.py` on port `8080`
- React/Vite control-room dashboard in `kingin-vite/` on port `5000`
- Windows setup and launch scripts for local desktop operation
- Streamlit/legacy dashboard files in `dashboard/`

## Desktop installation on Windows

### 1. Install prerequisites

Install these before running the project:

- Windows 10/11
- Python 3.10 or newer from `https://www.python.org/downloads/windows/`
  - During install, tick `Add Python to PATH`.
- Node.js 18 or newer from `https://nodejs.org/`
- MetaTrader 5, logged into your broker/demo account
- Optional: Sierra Chart if you use the DTC data-feed path

### 2. Clone the correct branch

```powershell
git clone -b master https://github.com/tonynagwerez20-hue/kingin.git
cd kingin
```

If you already cloned the repository:

```powershell
git fetch origin
git checkout master
git pull origin master
```

### 3. Install dependencies

Recommended one-click setup:

```powershell
.\SETUP_PROJECT.bat
```

For the local React dashboard setup/build:

```powershell
.\SETUP_TAURI.bat
```

Despite the historical filename, `SETUP_TAURI.bat` now prepares the local browser-based desktop dashboard in this branch. There is no Tauri native-app project in `master` because there is no `src-tauri`, `Cargo.toml`, or Tauri config present.

Manual setup equivalent:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd kingin-vite
npm install
npm run build
cd ..
```

### 4. Configure trading access

Review these files before live/demo operation:

- `config/trading_params_lite.json`
  - `pipeline.data_provider.config.login`
  - `pipeline.data_provider.config.password`
  - `pipeline.data_provider.config.server`
  - `trading.symbol`
  - `trading.lot_size`
  - `trading.master_switch`
- `config/trading_params.json` for the fuller strategy configuration
- `config/settings.py` for system-level settings

Do not live trade until you have verified the account, symbol, risk limits, and master switch settings on a demo account.

### 5. Launch the local desktop dashboard

Use:

```powershell
.\LAUNCH_DESKTOP_APP.bat
```

This starts:

- API server: `http://127.0.0.1:8080`
- React dashboard: `http://localhost:5000`

The dashboard uses same-origin `/api/*` calls through the Vite proxy, so browser code does not need direct cross-origin API access.

### 6. Launch the trading pipeline

For one-click trading-system startup:

```powershell
.\START_ALL.bat
```

This script:

1. Turns the master switch on.
2. Starts the data-feed server.
3. Starts the enabled dashboard option from config.
4. Runs the modular strategy pipeline.

You can also run the engine directly:

```powershell
python -m Engine.modular_bootstrapper
```

## MT5 pre-flight checklist

Before running live/demo execution:

- Open MetaTrader 5.
- Log into the intended account.
- Confirm Algo Trading is enabled.
- Attach/enable the ZMQ bridge EA if your execution path requires it.
- Confirm the configured account/server in `config/trading_params_lite.json` matches MT5.
- Start with demo trading and minimum lot size.

## Useful commands

Run API only:

```powershell
python kingin_api.py
```

Run dashboard only:

```powershell
cd kingin-vite
npm run dev
```

Build dashboard assets:

```powershell
.\BUILD_DESKTOP_APP.bat
```

Run Streamlit dashboard manually:

```powershell
streamlit run dashboard/dashboard_app.py
```

Run historical/backtest scripts:

```powershell
python run_backtest.py
python Engine/historical_backtest.py
```

## Project structure

```text
kingin/
├── Engine/                  Python trading engine and strategy pipeline
├── config/                  Trading/account/risk configuration
├── data_feed/               MT5/Sierra/data provider modules
├── dashboard/               Streamlit and static dashboard assets
├── execution/               Execution bridge modules
├── kingin-vite/             React/Vite control-room dashboard
├── storage/logs/            Runtime logs
├── kingin_api.py            FastAPI bridge for dashboard and engine controls
├── START_ALL.bat            One-click trading-system launcher
├── SETUP_PROJECT.bat        Python dependency/setup helper
├── LAUNCH_DESKTOP_APP.bat   Local API + React dashboard launcher
└── BUILD_DESKTOP_APP.bat    React dashboard production build helper
```

## Troubleshooting

### `Python is not installed or not in PATH`

Reinstall Python and tick `Add Python to PATH`, then open a new terminal and rerun setup.

### `MetaTrader5` fails to install

The `MetaTrader5` Python package is Windows-only and requires a compatible Python installation. Use Python 3.10/3.11 on Windows if your current version fails.

### Dashboard cannot reach API

Start `kingin_api.py` first, then start `kingin-vite` with `npm run dev`. The dashboard expects the API on `127.0.0.1:8080` through the `/api` proxy.

### Port already in use

Close old command windows or stop the process using ports `5000`, `8080`, or `8000`, then relaunch.

### Sierra Chart NTP Error 1314

If MT5 is your execution path, this does not block MT5 trade execution. Sierra Chart is only relevant when used as a data feed.

## Risk disclaimer

Trading involves substantial risk. This system is for research and educational use unless you have independently validated it. Always test on a demo account before live trading.
