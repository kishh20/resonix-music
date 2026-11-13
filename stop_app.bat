@echo off
title Stop Resonix Music Servers
cd /d "%~dp0"
echo ============================================================
echo               STOPPING RESONIX MUSIC SERVERS
echo ============================================================
echo.

echo [*] Stopping backend server (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] Stopping frontend dev server (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [OK] All Resonix Music background servers stopped.
echo.
pause
