@echo off
TITLE Institutional Trading System - ONE-CLICK START
SET "PROJECT_DIR=%~dp0"
SET "PYTHON_EXE=python"
SET "STREAMLIT_EXE=streamlit"
SET "DASHBOARD_PY=%PROJECT_DIR%dashboard\dashboard_app.py"

echo ==========================================================
echo    INSTITUTIONAL TRADING SYSTEM - ULTIMATE START
echo ==========================================================
echo.

:: 1. Force Master Switch ON
echo [1/4] Activating Master Switch...
"%PYTHON_EXE%" "%PROJECT_DIR%toggle_system.py" ON
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to set Master Switch. 
    pause
    exit /b
)

:: Pre-emptive: Kill any process on Port 8000 (Data Server)
echo [SYSTEM] Checking for existing Data Server on Port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [SYSTEM] Found ghost process %%a on Port 8000. Terminating...
    taskkill /PID %%a /F >nul 2>&1
)

:: 2. Launch Data Feed Server in Background
echo [2/4] Launching Data Feed Server...
start "DTC Server" cmd /k ""%PYTHON_EXE%" "%PROJECT_DIR%data_feed\server.py""
echo Waiting 5s for server initialization...
timeout /t 5 >nul

:: 3. Launch Dashboard in Background (If enabled in config)
echo [3/4] Checking Dashboard Configuration...
set "LAUNCH_DASHBOARD=true"
findstr /i "\"enable_streamlit_dashboard\": false" "%PROJECT_DIR%config\trading_params_lite.json" >nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Streamlit Dashboard is DISABLED in configuration. Skipping.
    set "LAUNCH_DASHBOARD=false"
)

if "%LAUNCH_DASHBOARD%"=="true" (
    echo [3/4] Launching Premium Dashboard...
    if exist "%STREAMLIT_EXE%" (
        start "Dashboard" cmd /c "cd /d "%PROJECT_DIR%" && "%STREAMLIT_EXE%" run "%DASHBOARD_PY%""
    ) else (
        echo [WARNING] Streamlit not found. Dashboard will not start.
    )
)

:: 4. Run Modular Strategy Pipeline in Foreground
echo [4/4] Starting Trading Engine...
echo.
set PYTHONPATH=%PROJECT_DIR%
python -m Engine.modular_bootstrapper

echo.
echo System stopped.
pause
