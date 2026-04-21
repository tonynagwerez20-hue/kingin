@echo off
setlocal
title KingIn Trading System - Build Desktop App

echo ============================================================
echo [1/4] Installing Root Dependencies...
echo ============================================================
call npm install --no-fund

echo.
echo ============================================================
echo [2/4] Installing Dashboard Dependencies...
echo ============================================================
cd kingin-vite
call npm install --no-fund
cd ..

echo.
echo ============================================================
echo [3/4] Building Dashboard (Vite)...
echo ============================================================
call npm run build

echo.
echo ============================================================
echo [4/4] Building Native Installer (Electron-Builder)...
echo ============================================================
echo This may take a few minutes as it compiles the native wrapper...
call npm run electron:build

echo.
echo ============================================================
echo BUILD COMPLETE!
echo ============================================================
echo Your professional installer is located in: 
echo dist_electron\KingIn Trading System Setup 1.0.0.exe
echo.
echo Launch the installer to:
echo 1. Install KingIn to your Program Files
echo 2. Add an icon to your Desktop
echo 3. Create a Start Menu shortcut
echo.
pause
