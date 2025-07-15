@echo off
echo Starting Finecons ITAM System for Windows...

REM Set environment variables for Windows
set NODE_ENV=production
set PORT=5000
set DATABASE_URL=postgresql://neondb_owner:npg_A2U5b6XEgaLi@ep-muddy-silence-a55iod1i.us-east-2.aws.neon.tech/neondb?sslmode=require

echo Environment configured for Windows
echo Starting server on port 5000...

REM Start the application
npm start

pause