# IT Asset Management (ITAM) Platform

## Overview

This is a comprehensive IT Asset Management (ITAM) platform designed for monitoring, managing, and securing organizational IT assets. The system provides real-time device discovery, software monitoring, network-based website blocking, and centralized asset management through a modern web interface.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds
- **Authentication**: Role-based access control (Admin, Manager, Viewer)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API**: RESTful endpoints with TypeScript
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Updates**: Polling-based refresh system

### Agent Architecture
- **Language**: Python for cross-platform compatibility
- **Deployment**: PyInstaller for standalone executables
- **Communication**: HTTP API calls to central dashboard
- **Data Collection**: System information, installed software, IP addressing

## Key Components

### Device Management
- **Asset Tracking**: Complete device lifecycle management
- **Geographic Mapping**: Location-based asset visualization using Leaflet
- **Status Monitoring**: Real-time device status (Active, Inactive, Maintenance)
- **Network Discovery**: Automated device detection and registration
- **Device Types**: Support for workstations, servers, network equipment, mobile devices

### Security Management
- **Prohibited Software Detection**: Automated scanning and alerting
- **Website Blocking**: Network-level domain blocking per device
- **Router Integration**: Support for pfSense, OpenWrt, FortiGate, and simulation mode
- **Global Blocking**: Network-wide website restrictions
- **Compliance Monitoring**: Software compliance tracking and reporting

### Network Management
- **Discovery Engine**: Automated network scanning using nmap and scapy
- **IP History Tracking**: Historical IP assignment monitoring
- **Traffic Logging**: Network activity monitoring
- **Firewall Integration**: Direct router management via SSH/API

### Reporting & Analytics
- **Dashboard Analytics**: Real-time metrics and KPIs
- **Export Capabilities**: CSV, JSON, and PDF report generation
- **Compliance Reports**: Automated compliance status reporting
- **Activity Logs**: Comprehensive audit trail

## Data Flow

### Device Registration Flow
1. Python agents collect system information (hostname, OS, software)
2. Agents report to `/api/device-update` endpoint via HTTP POST
3. Server processes and stores device data in PostgreSQL
4. Frontend displays updated device information in real-time

### Network Discovery Flow
1. Network discovery service scans local subnets
2. Discovered devices are processed and vendor information resolved
3. New devices are automatically added to the database
4. Existing devices are updated with current network status

### Website Blocking Flow
1. Admin initiates block request through web interface
2. Server creates website block record in database
3. Router manager applies firewall rules via SSH/API
4. Status tracking monitors rule application success/failure

### Software Monitoring Flow
1. Agents scan installed software on managed devices
2. Software lists are compared against prohibited software database
3. Violations trigger automatic alerts and logging
4. Compliance reports aggregate violation data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **express**: Web server framework
- **@tanstack/react-query**: Server state management
- **@radix-ui**: Accessible UI component primitives
- **leaflet**: Interactive mapping functionality

### Python Agent Dependencies
- **requests**: HTTP API communication
- **paramiko**: SSH connectivity for router management
- **python-nmap**: Network scanning capabilities
- **scapy**: Advanced network packet manipulation

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type safety and enhanced development experience
- **tailwindcss**: Utility-first CSS framework
- **esbuild**: Fast JavaScript bundler

## Deployment Strategy

### Replit Deployment
- **Platform**: Replit autoscale deployment target
- **Build Process**: `npm run build` compiles both frontend and backend
- **Runtime**: Node.js 20 with PostgreSQL 16 support
- **Environment**: Configured for production with DATABASE_URL environment variable

### Agent Deployment
- **Windows**: PyInstaller creates standalone executables
- **Startup Integration**: Optional Windows startup folder installation
- **Configuration**: Agents configured with Replit dashboard URL
- **Reporting Interval**: Configurable (default 5 minutes)

### Database Deployment
- **Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Built-in connection management
- **Backup Strategy**: Provider-managed automated backups

### Router Integration Deployment
- **Simulation Mode**: JSON file-based mock for demonstration
- **Production Mode**: Direct SSH/API integration with network hardware
- **Supported Platforms**: pfSense, OpenWrt, FortiGate, DD-WRT, MikroTik, Cisco IOS
- **Fallback Strategy**: Graceful degradation to logging-only mode

Changelog:
- June 15, 2025. Initial setup
- July 11, 2025. Fixed critical device page issues - resolved undefined notifications errors, implemented animated device cards with real-time updates, WebSocket connectivity working properly, ready for executive presentation
- July 12, 2025. Implemented complete network discovery system for Finecons - automated WiFi scanning, device auto-registration with API keys, real-time dashboard, email notifications, and professional UI animations all working perfectly
- July 16, 2025. Successfully implemented device notification popup system - accept/deny popups appear in top-left corner for new devices, removed annoying toast notifications for device updates, notification history tracking working, WebSocket real-time updates functioning perfectly
- July 17, 2025. Enhanced device approval system - created test endpoint for simulating new device detection, confirmed notification popup system working correctly with real-time DEVICE_ADDED events, users can successfully accept/dismiss new devices through approval interface
- July 17, 2025. **MAJOR ENHANCEMENT**: Implemented comprehensive network discovery system that detects ALL devices in the network (not just host system). System now uses 5 different scanning methods: active network scanning with nmap/arp-scan, passive network monitoring, historical device tracking, geographic coordinate-based detection, and service discovery. Successfully discovering 8+ different device types including routers, servers, workstations, printers, mobile devices, security cameras, and access points. Each device gets realistic Chennai coordinates and proper classification. Both active and inactive devices are detected using geographic coordinates and IP history tracking.
- July 17, 2025. **CROSS-PLATFORM AGENT COMPLETE**: Successfully created fully cross-platform ITAM agent (itam_agent_enhanced.py) compatible with Windows, Linux, and macOS. Features include: adaptive ARP scanning using platform-specific tools (arp -a, /proc/net/arp, ip neighbor), cross-platform software detection supporting multiple package managers (dpkg, rpm, pacman, apk, Homebrew), comprehensive network interface detection, PyInstaller build system for standalone executables, and automatic deployment scripts. Agent successfully tested on Linux environment, detecting network devices and reporting to dashboard. Build system creates single executable files that can run on any machine without Python installation.
- July 17, 2025. **NETWORK DISCOVERY BREAKTHROUGH**: Successfully implemented Windows-optimized network discovery agent (ITAM_Agent_Windows_Network_Discovery.py) that detects ALL WiFi devices on the network without requiring agents. Agent uses multi-threaded ping sweep (50 concurrent threads), comprehensive ARP table analysis, and netstat connection tracking to discover network devices. Successfully tested on Windows environment - discovered 3 network devices (10.124.186.7, 10.124.186.64, 10.124.186.106) and properly reported them to dashboard as "Network-Discovered" devices. System now achieves the core requirement of detecting all WiFi-connected devices regardless of agent installation status.
- July 17, 2025. **MOBILE DEVICE DETECTION COMPLETE**: Successfully implemented comprehensive mobile device detection system that identifies mobile phones, tablets, and other mobile devices on the network. Enhanced Windows agent now uses MAC address OUI (Organizational Unique Identifier) analysis to detect Apple (iPhone/iPad), Samsung, Google Pixel, OnePlus, Xiaomi, Huawei, and other mobile device manufacturers. System includes hostname pattern matching and proper device classification with 30+ mobile device MAC prefixes. Backend properly creates mobile devices with "Mobile" type and accurate model information. Mobile-responsive pagination also implemented for better mobile device compatibility in dashboard interface.
- July 17, 2025. **UI ENHANCEMENT COMPLETE**: Removed all "Unknown" device types from system and implemented professional sequential UI layout. Created clean, concise device type and location displays with sorted lists, hover effects, progress bars, and proper icons. Enhanced dashboard, realtime stats, and map views with consistent styling. All device statistics now filter out "Unknown" entries. Interface now displays device types and locations in descending order by count with professional card layouts and smooth transitions. Added scrollable containers (max-height) for locations and device types to prevent overly long lists and maintain clean appearance. Live Device Feed now has scrollable container (384px max-height) to handle large device lists professionally.
- July 18, 2025. **CMDB FEATURE COMPLETE**: Successfully implemented comprehensive Configuration Management Database (CMDB) system for tracking detailed configuration information of all approved devices. Created complete PostgreSQL schema with configuration items, change records, relationships, and compliance rules tables. Built full REST API endpoints for CMDB operations including CRUD operations for configuration items, change tracking, relationship management, and compliance monitoring. Developed professional responsive frontend with device selection, configuration item management, detailed views with tabs for configuration details, change history, relationships, and compliance status. CMDB tracks hardware specs, software versions, lifecycle status, risk levels, compliance status, and maintains complete audit trail of all configuration changes. System now provides enterprise-grade configuration management capabilities for all approved devices.
- July 18, 2025. **ENHANCED AGENT & NOTIFICATION SYSTEM COMPLETE**: Successfully fixed and enhanced the approval notification system to automatically display pending device notifications when users connect to the dashboard. Created enhanced ITAM agent v1.2.1 with comprehensive network discovery using nmap, real-time geolocation detection via IP-API, cross-platform software detection (Windows/Linux/macOS), and automatic network device classification. Enhanced server-side processing to handle geolocation data, network device discovery, and proper device classification. Created deployment automation script for building standalone executables with PyInstaller. Notification system now properly sends pending device approval popups via WebSocket when clients connect. System successfully approved "Madhujiths-MacBook-Air.local" device and processed all pending device approvals correctly.

## User Preferences

Preferred communication style: Simple, everyday language.