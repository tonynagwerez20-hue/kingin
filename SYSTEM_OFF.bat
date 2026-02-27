@echo off
TITLE HedgeEA - System STOP
cd /d "%~dp0"
python toggle_system.py OFF
echo.
pause
