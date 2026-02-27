@echo off
TITLE Institutional Trading System - PORTABLE SETUP
SET "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo ==========================================================
2echo    HedgeEA PROFESSIONAL SETUP & INSTALLATION
echo ==========================================================
echo.

:: 1. Check for Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10 and tick "Add to PATH".
    pause
    exit /b
)
echo [OK] Python detected.

:: 2. Install/Update Core Dependencies
echo [INFO] Installing required libraries into Global Python...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Dependency installation failed. Check your internet or Python permissions.
    pause
    exit /b
)
echo [OK] Libraries installed successfully.

:: 3. Setup Folders
echo [INFO] Creating system directories...
if not exist "storage\logs" mkdir "storage\logs"
if not exist "data" mkdir "data"
echo [OK] Folders ready.

:: 4. Verify MT5 Connectivity Check
echo [INFO] Setup complete. 
echo.
echo ==========================================================
echo    QUICK START GUIDE
echo ==========================================================
echo 1. Open MetaTrader 5 and log in.
echo 2. Run START_ALL.bat to launch the system.
echo.
echo NOTE: Global Python 3.10 is the recommended stable path.
echo       Avoid virtual environments if you experience crashes.
echo ==========================================================
pause
