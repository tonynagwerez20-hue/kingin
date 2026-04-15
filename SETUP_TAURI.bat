@echo off
REM ============================================================================
REM INSTITUTIONAL TRADING SYSTEM - SETUP SCRIPT
REM ============================================================================
REM 
REM This script sets up the Tauri v2 + React desktop application.
REM 
REM PREREQUISITES:
REM - Node.js 18+ (https://nodejs.org)
REM - Rust (https://rustup.rs)
REM 
REM USAGE:
REM 1. Install Node.js and Rust first
REM 2. Run this script: SETUP_TAURI.bat
REM 
REM ============================================================================

echo.
echo ================================================================
echo Institutional Trading System - Tauri Setup
echo ================================================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo Node.js found:

REM Check Rust
echo Checking Rust...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust not found. Please install Rust from https://rustup.rs
    pause
    exit /b 1
)

echo Setting Rust default toolchain to stable to prevent compilation errors...
rustup default stable

REM Check Microsoft C++ Build Tools (Linker)
echo Checking for Windows C++ Build Tools...
if not exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
    echo [ERROR] Microsoft Desktop C++ Compiler is MISSING!
    echo The native desktop application cannot be compiled without it.
    echo Please right-click "INSTALL_CPP_TOOLS_ADMIN.ps1" and select "Run with PowerShell" as Administrator.
    pause
    exit /b 1
)
echo Rust and Windows Native Linker look ready!

REM Install npm dependencies
echo.
echo Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo Dependencies installed

REM Generate icons
echo.
echo Generating icons...
call node generate_icon.js
if errorlevel 1 (
    echo [ERROR] Icon generation failed
    pause
    exit /b 1
)
echo Icons generated

REM Build frontend
echo.
echo Building frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)
echo Frontend built

REM Build Tauri app
echo.
echo Building Tauri application...
call npm run tauri:build
if errorlevel 1 (
    echo [ERROR] Tauri build failed
    pause
    exit /b 1
)
echo.

echo ================================================================
echo BUILD COMPLETE
echo ================================================================
echo.
echo The executable is in: src-tauri\target\release\
echo.
pause