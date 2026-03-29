@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo  Diet Recipe Scraper - Setup
echo ============================================
echo.

:: Read .env file
set ENV_FILE=%~dp0..\.env
if not exist "%ENV_FILE%" (
    echo [ERROR] .env file not found: %ENV_FILE%
    pause
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    set "KEY=%%A"
    set "VAL=%%B"
    if "!KEY!"=="DB_HOST"     set DB_HOST=!VAL!
    if "!KEY!"=="DB_USER"     set DB_USER=!VAL!
    if "!KEY!"=="DB_PASSWORD" set DB_PASSWORD=!VAL!
    if "!KEY!"=="DB_NAME"     set DB_NAME=!VAL!
)

echo [INFO] DB_HOST: %DB_HOST%
echo [INFO] DB_USER: %DB_USER%
echo [INFO] DB_NAME: %DB_NAME%
echo.

:: Find mysql.exe
set MYSQL_EXE=
for %%P in (
    "C:\Program Files\MariaDB 11.8\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.7\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.6\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.5\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.4\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.3\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.2\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.1\bin\mysql.exe"
    "C:\Program Files\MariaDB 11.0\bin\mysql.exe"
    "C:\Program Files\MariaDB 10.11\bin\mysql.exe"
    "C:\Program Files\MariaDB 10.6\bin\mysql.exe"
    "C:\Program Files\MariaDB 10.5\bin\mysql.exe"
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
) do (
    if exist %%P (
        set MYSQL_EXE=%%~P
        goto :found_mysql
    )
)

where mysql >nul 2>&1
if %ERRORLEVEL%==0 (
    set MYSQL_EXE=mysql
    goto :found_mysql
)

echo [ERROR] mysql.exe not found. Please install MariaDB or MySQL.
pause
exit /b 1

:found_mysql
echo [INFO] MySQL path: %MYSQL_EXE%
echo.

:: Step 1: Create database if not exists
echo [1/3] Creating database if not exists ...
if "%DB_PASSWORD%"=="" (
    "%MYSQL_EXE%" -h %DB_HOST% -u %DB_USER% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
) else (
    "%MYSQL_EXE%" -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
)
if %ERRORLEVEL%==0 (
    echo [OK] Database ready: %DB_NAME%
) else (
    echo [ERROR] Failed to create database. Check .env credentials.
    pause
    exit /b 1
)
echo.

:: Step 2: Run init.sql
echo [2/3] Running init.sql ...
set SQL_FILE=%~dp0sql\init.sql

if not exist "%SQL_FILE%" (
    echo [ERROR] init.sql not found: %SQL_FILE%
    pause
    exit /b 1
)

if "%DB_PASSWORD%"=="" (
    "%MYSQL_EXE%" -h %DB_HOST% -u %DB_USER% %DB_NAME% < "%SQL_FILE%"
) else (
    "%MYSQL_EXE%" -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < "%SQL_FILE%"
)

if %ERRORLEVEL%==0 (
    echo [OK] DB init success
) else (
    echo [ERROR] DB init failed.
    pause
    exit /b 1
)
echo.

:: Step 3: npm install
echo [3/3] Running npm install ...
cd /d "%~dp0"

if exist "node_modules" (
    echo [SKIP] node_modules already exists.
) else (
    call npm install
    if %ERRORLEVEL%==0 (
        echo [OK] npm install success
    ) else (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)
echo.

echo ============================================
echo  Setup complete!
echo ============================================
echo.
echo Test run (no save):
echo   node index.js --limit=10 --dry-run
echo.
echo Full run:
echo   node index.js
echo.
pause
