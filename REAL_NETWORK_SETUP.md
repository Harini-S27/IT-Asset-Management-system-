# Real Network Scanning Setup Guide

## Current Issue
Your system is using fallback simulated devices because `nmap` isn't available in Replit environment.

## Solution: Real Network Discovery

### Option 1: Deploy on Host Server (Recommended)
1. Extract ZIP on your Windows/Linux server
2. Install nmap: `sudo apt install nmap` (Linux) or download from nmap.org (Windows)
3. Run: `npm install && npm start`
4. Real network scanning will work automatically

### Option 2: Enhanced Agent-Only Mode
Use only Python agents without network scanning - agents report directly to dashboard.

### Option 3: Hybrid Mode (Best for Finecons)
Combine both approaches for maximum coverage.

## Network Scanner Configuration
- Scans: 192.168.1.0/24, 192.168.0.0/24, 10.0.0.0/24
- Interval: 5 minutes
- Auto-generates API keys for discovered devices
- Python agents enhance discovered devices with detailed info

## Agent Installation
1. Install itam_agent.py on client machines
2. Agent uses API key from network discovery
3. Reports detailed system information every 30 seconds