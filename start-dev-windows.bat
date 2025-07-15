@echo off
echo ===============================================
echo   Finecons ITAM System - Development Mode
echo ===============================================

REM Set environment variables for Windows
set NODE_ENV=development
set PORT=5000
set DATABASE_URL=postgresql://neondb_owner:npg_AKoQlmcqJ59D@ep-shy-union-a5177jy5.us-east-2.aws.neon.tech/neondb?sslmode=require

echo Environment configured for Development:
echo - Node Environment: %NODE_ENV%
echo - Port: %PORT%
echo - Database: Connected to Neon PostgreSQL
echo.

echo Starting development server...
echo Dashboard will be available at: http://localhost:5000
echo Network scanning will start automatically
echo Press Ctrl+C to stop
echo.

REM Start in development mode (no build required)
tsx server/index.ts

pause