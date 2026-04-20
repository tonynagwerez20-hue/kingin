@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%kingin-vite"

cd /d "%PROJECT_DIR%"

echo Building KingIn desktop dashboard assets...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found in PATH. Install Node.js 18 or newer.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm not found in PATH. Reinstall Node.js with npm enabled.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: React dashboard package not found at %FRONTEND_DIR%.
    pause
    exit /b 1
)

cd /d "%FRONTEND_DIR%"

if exist package-lock.json (
    echo Installing JavaScript dependencies with npm ci...
    call npm ci
) else (
    echo Installing JavaScript dependencies with npm install...
    call npm install
)
if %errorlevel% neq 0 (
    echo ERROR: Failed to install JavaScript dependencies.
    pause
    exit /b 1
)

echo.
echo Building production dashboard...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build the React dashboard.
    pause
    exit /b 1
)

echo.
echo Build complete.
echo Dashboard output: %FRONTEND_DIR%\dist
echo Use LAUNCH_DESKTOP_APP.bat for local desktop/browser operation.

endlocal
pause
