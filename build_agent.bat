@echo off
echo Building ITAM Agent...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Install required packages
echo Installing required packages...
pip install requests pyinstaller

REM Update the dashboard URL in agent.py
echo.
echo IMPORTANT: Before building, update the DASHBOARD_URL in agent.py
echo Replace "your-replit-url" with your actual Replit URL
echo Example: https://your-project-name.your-username.replit.app/api/device-update
echo.
pause

REM Build the executable
echo Building agent.exe...
pyinstaller --onefile --noconsole --name "itam-agent" agent.py

if exist "dist\itam-agent.exe" (
    echo.
    echo ✓ Agent built successfully!
    echo Location: dist\itam-agent.exe
    echo.
    echo To install on startup (optional):
    echo 1. Copy itam-agent.exe to a permanent location
    echo 2. Press Win+R, type "shell:startup", press Enter
    echo 3. Create a shortcut to itam-agent.exe in the startup folder
    echo.
) else (
    echo.
    echo ✗ Build failed. Check for errors above.
)

pause