BNMQ    `       ASawaqaz'/;.L,KJHUdesaq QAWESDTGHUJNI,L;.'/

;PLKOJHYUEWAqA,@echo off
echo Building Institutional Trading System Desktop App...
echo.

cd /d "%~dp0"

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build React app
    pause
    exit /b 1
)

echo.
echo Building Tauri desktop app...
call npm run tauri:build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Tauri app
    pause
    exit /b 1
)

echo.
echo Creating desktop shortcut...
call create_shortcut.bat
if %errorlevel% neq 0 (
    echo WARNING: Failed to create shortcut, but build was successful
)

echo.
echo Build complete! Check the src-tauri/target/release/ directory for the executable.
echo Desktop shortcut should be available on your desktop.
pause