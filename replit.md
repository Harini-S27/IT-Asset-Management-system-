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

## User Preferences

Preferred communication style: Simple, everyday language.