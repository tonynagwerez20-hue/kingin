@echo off
TITLE Institutional Trading System - Dashboard
<<<<<<< HEAD
SET "PROJECT_DIR=%~dp0"
SET "STREAMLIT_EXE=%PROJECT_DIR%.venv_v2\Scripts\streamlit.exe"
SET "APP_PY=%PROJECT_DIR%dashboard\dashboard_app.py"
=======
SET "PROJECT_DIR=e:\s.y.s.t.e.m"
SET "STREAMLIT_EXE=%PROJECT_DIR%\.venv\Scripts\streamlit.exe"
SET "APP_PY=%PROJECT_DIR%\dashboard\dashboard_app.py"
>>>>>>> replit-agent

echo ==========================================================
echo    INSTITUTIONAL TRADING SYSTEM - DASHBOARD
echo ==========================================================
echo Starting Premium Dashboard...
echo Dashboard Path: %APP_PY%
echo.

:: Check if streamlit exists
if not exist "%STREAMLIT_EXE%" (
    echo [ERROR] Virtual environment or Streamlit not found at %STREAMLIT_EXE%
    echo Please ensure the venv is created and dependencies are installed.
    pause
    exit /b
)

:: Run the dashboard
cd /d "%PROJECT_DIR%"
<<<<<<< HEAD
streamlit run "%APP_PY%"
=======
"%STREAMLIT_EXE%" run "%APP_PY%"
>>>>>>> replit-agent

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Dashboard failed to start or was closed unexpectedly.
    pause
)
