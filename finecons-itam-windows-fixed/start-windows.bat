@echo off
echo ===============================================
echo    Finecons ITAM System - Windows Startup
echo ===============================================

REM Set environment variables for Windows
set NODE_ENV=production
set PORT=5000
set DATABASE_URL=postgresql://neondb_owner:npg_AKoQlmcqJ59D@ep-shy-union-a5177jy5.us-east-2.aws.neon.tech/neondb?sslmode=require

echo Environment configured:
echo - Node Environment: %NODE_ENV%
echo - Port: %PORT%
echo - Database: Connected to Neon PostgreSQL

echo.
echo Building application...
call npm run build

echo.
echo Starting ITAM Dashboard...
echo Dashboard will be available at: http://localhost:5000
echo.

REM Start the application
node dist/index.js

pause