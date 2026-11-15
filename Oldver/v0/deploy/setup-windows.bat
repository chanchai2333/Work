@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

echo.
echo === DWSS Windows setup ===
echo Project: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found.
  echo Install the LTS Windows installer from https://nodejs.org/en/download
  echo Then open a new Command Prompt and run this script again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js, then run this script again.
  pause
  exit /b 1
)

echo Node:
node -v
echo npm:
call npm -v
echo.

if not exist package.json (
  echo package.json was not found. Run this script from the unzipped Work-main folder.
  pause
  exit /b 1
)

echo Installing Node packages...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

set "DB_HOST=127.0.0.1"
set "DB_PORT=3306"
set "DB_USER=dwss"
set "DB_PASSWORD=dwss_cloud_pass"
set "DB_NAME=dwss"

echo.
echo Checking MariaDB...
set "MYSQL="
where mysql >nul 2>&1 && set "MYSQL=mysql"
if not defined MYSQL (
  for /d %%D in ("C:\Program Files\MariaDB*") do (
    if exist "%%D\bin\mysql.exe" set "MYSQL=%%D\bin\mysql.exe"
  )
)
if not defined MYSQL (
  echo mysql.exe was not found. Install MariaDB, then run this script again.
  pause
  exit /b 1
)

"%MYSQL%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% --protocol=TCP -e "SELECT 1" >nul 2>&1
if not errorlevel 1 (
  echo MariaDB user %DB_USER% is ready.
  goto start_app
)

echo.
echo The dwss database user is not ready yet.
echo Enter the MariaDB root password to create it automatically.
set /p ROOT_PASSWORD=MariaDB root password: 

"%MYSQL%" -u root -p%ROOT_PASSWORD% -h %DB_HOST% -P %DB_PORT% --protocol=TCP -e "CREATE DATABASE IF NOT EXISTS dwss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'dwss'@'localhost' IDENTIFIED BY 'dwss_cloud_pass'; CREATE USER IF NOT EXISTS 'dwss'@'127.0.0.1' IDENTIFIED BY 'dwss_cloud_pass'; CREATE USER IF NOT EXISTS 'dwss'@'%%' IDENTIFIED BY 'dwss_cloud_pass'; GRANT ALL ON dwss.* TO 'dwss'@'localhost'; GRANT ALL ON dwss.* TO 'dwss'@'127.0.0.1'; GRANT ALL ON dwss.* TO 'dwss'@'%%'; FLUSH PRIVILEGES;"
if errorlevel 1 (
  echo Could not create the database. Check the root password and that MariaDB is running.
  pause
  exit /b 1
)
echo Database dwss and user dwss created.

:start_app
echo.
echo Stopping any old DWSS Node process...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8080 .*LISTENING"') do (
  taskkill /F /PID %%P >nul 2>&1
)
echo Starting DWSS at http://localhost:8080
echo Leave this window open. Press Ctrl+C to stop.
echo.
node server.js
pause
