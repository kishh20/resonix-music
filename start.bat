@echo off
title Resonix Music Streaming Platform
color 0A

echo ======================================================================
echo           RESONIX - PREMIUM MUSIC STREAMING PLATFORM
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and check "Add to PATH".
    pause
    exit /b 1
)

:: 2. Check Node
call npm.cmd --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or npm.cmd not found!
    echo Please install Node.js LTS from nodejs.org.
    pause
    exit /b 1
)

:: 3. Setup Python Backend Virtual Environment if needed
if not exist "backend\venv\Scripts\python.exe" (
    echo [*] Creating Python virtual environment in backend\venv...
    python -m venv backend\venv
    echo [*] Installing backend dependencies...
    .\backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

:: 4. Setup Frontend node_modules if needed
if not exist "frontend\node_modules" (
    echo [*] Installing frontend packages...
    cd frontend
    call npm.cmd install
    cd ..
)

:: 4.5 Ensure Desktop Shortcut exists on Home Screen / Desktop
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_desktop_shortcut.ps1" >nul 2>&1

:: 5. Discover Local LAN IP for Mobile Access
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } | Select-Object -First 1).IPAddress"') do set LAN_IP=%%i

if "%LAN_IP%"=="" (
    set LAN_IP=localhost
)

echo.
echo ======================================================================
echo [OK] Platform Ready!
echo.
echo   - Desktop App:      "Resonix Music" shortcut on your Desktop
echo   - Laptop Access:    http://localhost:5173
echo   - Android Phone:    http://%LAN_IP%:5173
echo   - Backend API Docs: http://localhost:8000/docs
echo ======================================================================
echo.
echo [*] Starting FastAPI Backend on port 8000...
start "Resonix Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe run.py"

echo [*] Starting Vite Frontend on port 5173...
start "Resonix Frontend" cmd /k "cd /d "%~dp0frontend" && call npm.cmd run dev -- --host 0.0.0.0"

timeout /t 3 >nul

echo [*] Launching Resonix Music App...
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --app-id=resonix-music
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --app-id=resonix-music
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173 --app-id=resonix-music
) else (
    start http://localhost:5173
)

echo.
echo Enjoy streaming on Resonix! Keep this window open or minimize it.
echo Press any key to exit this launcher window.
pause >nul
