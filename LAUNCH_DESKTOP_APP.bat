@echo off
echo Launching Institutional Trading System Desktop App (Development Mode)...
echo.

cd /d "%~dp0"

echo Starting Tauri development server...
call npm run tauri dev

echo.
echo Desktop app closed.
pause