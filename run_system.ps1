
Write-Host "=========================================="
Write-Host "   IGOF SYSTEM STARTUP  "
Write-Host "=========================================="
Write-Host ""
Write-Host "[1/3] Checks..."
$pythonPath = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonPath = ".venv\Scripts\python.exe"
    Write-Host "Using Virtual Environment: $pythonPath"
} else {
    Write-Host "Using Global Python"
}

Write-Host "[2/3] Launching Data Feed Server (server.py)..."
# Start-Process -FilePath $pythonPath -ArgumentList "data_feed/server.py" -NoNewWindow
# Better: Start in new window so we can see logs
Start-Process "cmd.exe" -ArgumentList "/k $pythonPath data_feed/server.py"
Write-Host "Waiting 5 seconds for Server to initialize..."
Start-Sleep -Seconds 5

Write-Host "[3/3] Launching Main Strategy Loop (main_loop.py)..."
& $pythonPath Engine/main_loop.py

Write-Host "System Shutdown."
Read-Host "Press Enter to exit..."
