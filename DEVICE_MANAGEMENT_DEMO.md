# Complete Device Management System

Your ITAM dashboard now includes a comprehensive device management system that allows administrators to control network access for individual devices through your router configuration.

## System Architecture

### Backend API Endpoints
- **POST /api/device-management/block** - Block specific websites for a device
- **POST /api/device-management/unblock** - Remove website blocks
- **POST /api/device-management/disconnect** - Completely disconnect device from network
- **POST /api/device-management/reconnect** - Restore network access
- **GET /api/device-management/:deviceId/status** - Get device blocking status

### Router Integration Modes

#### Simulated Mode (Demo/Testing)
- Uses mock firewall responses for demonstration
- Perfect for testing the interface without real router access
- Provides realistic success/failure simulation
- All actions logged to database for audit trail

#### Real SSH Control Mode
- Connects to actual router via SSH using your configured credentials
- Supports multiple router types: pfSense, OpenWrt, FortiGate, DD-WRT, MikroTik, Cisco IOS
- Creates real firewall rules (iptables, pfctl, etc.)
- Automatic router type detection and capability checking

## Key Features

### Device-Level Controls
1. **Website Blocking**
   - Block specific domains (facebook.com, youtube.com, etc.)
   - Domain validation and cleanup (removes http://, www. automatically)
   - Reason tracking for compliance and audit
   - Real-time status updates

2. **Complete Device Disconnection**
   - Blocks all network traffic for a device
   - Optional reason recording
   - Quick disconnect for immediate action
   - Easy reconnection when needed

3. **Status Monitoring**
   - Real-time device access status
   - List of currently blocked websites
   - Visual indicators (badges) showing device state
   - Automatic refresh every 30 seconds

### Management Interface
- **Device Management Dropdown**: Added to each device in your tables
- **Status Badges**: Visual indicators showing device access state
- **Interactive Dialogs**: User-friendly forms for blocking/unblocking
- **Bulk Operations**: Support for managing multiple restrictions

## Integration Points

### Network Discovery Integration
- Works with your existing MAC-based device tracking
- Integrates with dynamic IP monitoring (DHCP simulation)
- Real-time updates as devices change IP addresses
- Maintains blocks even when device IPs change (uses MAC address tracking)

### Router Setup Integration
- Uses your configured router connection settings
- Automatically switches between simulated and real modes
- Leverages SSH credentials from Router Setup panel
- Respects firewall type detection and capabilities

### Database Integration
- All actions stored in website_blocks table
- Complete audit trail with timestamps and user tracking
- Status tracking (pending, active, failed, removed)
- Historical reporting and compliance data

## Usage Instructions

### Blocking a Website for a Device

1. Navigate to any device table (Devices page, Network Discovery)
2. Find the device you want to manage
3. Click the "Manage" dropdown button
4. Select "Block Website"
5. Enter the domain to block (e.g., facebook.com)
6. Optionally provide a reason
7. Click "Block Website"

The system will:
- Validate the domain format
- Create a firewall rule on your router (or simulate)
- Store the action in database
- Update the device status badge
- Show success/failure notification

### Disconnecting a Device

1. Open the device management dropdown
2. Choose "Quick Disconnect" for immediate action, or
3. Choose "Disconnect with Reason" for documented disconnection
4. Confirm the action

The device will be completely blocked from network access.

### Viewing Device Status

Device status is shown through colored badges:
- **Green "Open Access"**: No restrictions applied
- **Yellow "X blocked"**: Website blocks active
- **Red "Disconnected"**: Complete network disconnection

### Managing Existing Blocks

1. Open the management dropdown for a device with blocks
2. Select "Unblock Website"
3. Choose which websites to unblock from the list
4. Click "Unblock" for specific domains

## Technical Implementation

### Firewall Rule Creation

The system creates router-specific firewall rules:

**pfSense Example:**
```bash
pfctl -t blocked_domains -T add facebook.com
echo "block drop from 192.168.1.100 to facebook.com" >> /tmp/rules
pfctl -f /tmp/rules
```

**OpenWrt Example:**
```bash
iptables -I FORWARD -s 192.168.1.100 -d facebook.com -j DROP
echo "192.168.1.100 facebook.com" >> /etc/dnsmasq.d/blocked
/etc/init.d/dnsmasq restart
```

**Simulation Mode:**
Stores rules in JSON format and provides realistic response simulation.

### Security Considerations

- **Admin Authentication**: All actions require admin privileges
- **Audit Logging**: Complete trail of who blocked what and when
- **Reason Tracking**: Business justification for all restrictions
- **Reversible Actions**: All blocks can be easily removed
- **Safe Defaults**: Confirmation dialogs for destructive actions

### Error Handling

- **Connection Failures**: Graceful fallback with error messages
- **Invalid Domains**: Real-time validation and user feedback
- **Router Incompatibility**: Automatic detection and appropriate responses
- **Network Issues**: Retry mechanisms and status reporting

## Production Deployment

### Router Configuration
1. Complete Router Setup panel with your actual router credentials
2. Test connection to ensure SSH access works
3. Verify firewall capabilities are detected correctly
4. Switch from "Simulated" to "Real SSH Control" mode

### User Training
- Administrators should understand the difference between website blocking and full disconnection
- Document your organization's policies for device restrictions
- Establish approval workflows for sensitive actions

### Monitoring
- Regular review of device management logs
- Monitor for failed firewall operations
- Check router connectivity status in Router Setup panel

This device management system provides enterprise-grade network access control integrated directly into your ITAM dashboard, supporting both demonstration and production environments.