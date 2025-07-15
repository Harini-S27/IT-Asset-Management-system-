# Windows Deployment Instructions

## Current Issue
You're trying to run npm in a directory without the project files. The ZIP needs to be extracted first.

## Step-by-Step Fix

### 1. Download the ZIP file
- Download `finecons-itam-system.zip` from your Replit project
- Save it to your Windows computer

### 2. Extract the ZIP file
```powershell
# Navigate to where you saved the ZIP
cd "C:\Users\27har\OneDrive\Documents"

# Create a new folder for the project
mkdir "ITAM-System"
cd "ITAM-System"

# Extract the ZIP here (right-click ZIP file > Extract All)
# Or use PowerShell:
Expand-Archive -Path "..\finecons-itam-system.zip" -DestinationPath "."
```

### 3. Verify files are extracted
```powershell
# Check if package.json exists
dir package.json

# You should see:
# package.json, server/, client/, shared/ folders
```

### 4. Install dependencies
```powershell
# Now npm install will work
npm install
```

### 5. Set up environment
```powershell
# Create .env file
echo DATABASE_URL=postgresql://neondb_owner:npg_A2U5b6XEgaLi@ep-muddy-silence-a55iod1i.us-east-2.aws.neon.tech/neondb?sslmode=require > .env
echo NODE_ENV=production >> .env
echo PORT=5000 >> .env
```

### 6. Start the system
```powershell
npm start
```

## Expected Results
- ARP scanning will work automatically on Windows
- Network discovery will find devices on your WiFi
- Dashboard available at http://localhost:5000
- Real device discovery without mock data

## Next Steps
1. Extract ZIP to proper folder
2. Run commands in the extracted folder
3. System will discover real network devices