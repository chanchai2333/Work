@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

set "DB_HOST=127.0.0.1"
set "DB_PORT=3306"
set "DB_USER=dwss"
set "DB_PASSWORD=dwss_cloud_pass"
set "DB_NAME=dwss"

echo Stopping any old DWSS Node process...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8080 .*LISTENING"') do (
  taskkill /F /PID %%P >nul 2>&1
)
echo Starting DWSS at http://localhost:8080
echo Leave this window open. Press Ctrl+C to stop.
node server.js
pause
