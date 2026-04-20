# KingIn Institutional Trading System

## Overview
A professional trading control room dashboard (KingIn) with a Python-based trading engine (MT5 integration). The frontend is a Vite + React app displaying real-time trading data.

## Project Structure

```
kingin-vite/          ← Main web app (Vite + React, runs in browser)
  src/
    App.jsx           - App shell, handles auth state
    KingInDashboard.jsx - Main dashboard UI (8 panels)
    Dashboard.jsx     - Alternative dashboard view
    Login.jsx         - Login page
    tauri-stub.js     - Browser stub replacing Tauri desktop APIs
    hooks/            - useWebSocket, useAppStore
    lib/              - formatters, mockData
    store/            - Zustand app state

dashboard-react/      ← Legacy Next.js app (not currently served)

Engine/               ← Python trading engine
supervisor.py         ← System supervisor
support/              ← Supporting Python modules
data_feed/            ← Market data feed
```

## Running the App
The "Start application" workflow runs: `cd kingin-vite && npm run dev`
- Port: 5000 (Replit webview)
- Host: 0.0.0.0

## Key Notes
- Originally a Tauri desktop app (master branch); adapted for web by replacing `@tauri-apps/api/tauri` with `src/tauri-stub.js`
- The stub returns demo/mock data for all backend commands (read_engine_state, start_engine, stop_engine, auth_mt5)
- Currently auto-logs in with a demo session token
- Live data connection to the Python trading engine is a planned follow-up
