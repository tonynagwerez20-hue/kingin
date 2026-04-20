@echo off
setlocal

echo Building Institutional Trading System Desktop App...
echo.

cd /d "%~dp0"

rem --- Quick environment checks ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found in PATH. Install Node 18+.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm not found in PATH. Ensure npm is installed.
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Rust/cargo not found. Tauri build may fail or be skipped.
    set "RUST_FOUND=0"
) else (
    set "RUST_FOUND=1"
)

echo Installing JS dependencies (using npm ci for reproducible installs)...
call npm ci
if %errorlevel% neq 0 (
    echo ERROR: Failed to install JS dependencies (npm ci)
    pause
    exit /b 1
)

echo.
echo Building React app (production)...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build React app
    pause
    exit /b 1
)

echo.
if "%RUST_FOUND%"=="1" (
    echo Building Tauri desktop app (requires Rust toolchain)...
    call npm run tauri:build
    if %errorlevel% neq 0 (
        echo ERROR: Failed to build Tauri app
        pause
        exit /b 1
    )
) else (
    echo Skipping Tauri build because Rust/cargo was not found.
)

echo.
echo Creating desktop shortcut (if helper exists)...
if exist create_shortcut.bat (
    call create_shortcut.bat
    if %errorlevel% neq 0 (
        echo WARNING: Failed to create shortcut, but build steps completed.
    )
) else (
    echo create_shortcut.bat not found; skipping shortcut creation.
)

echo.
echo Build complete! If Tauri was built, check src-tauri\target\release for the installer/executable.
echo Desktop shortcut should be available on your desktop if creation succeeded.

endlocal
pause