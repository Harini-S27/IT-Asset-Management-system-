# Network-Based Website Blocking System

Your ITAM dashboard now includes a comprehensive network-based website blocking feature that allows administrators to block websites for specific devices without requiring client-side agents.

## System Architecture

### Backend Components
1. **Database Schema**: Website blocks, blocking history, and firewall rule tracking
2. **Firewall Integration**: Supports pfSense, OpenWrt, FortiGate, and simulation mode
3. **API Endpoints**: Complete REST API for managing website blocks
4. **Storage Layer**: Full CRUD operations for website blocking management

### Frontend Components
1. **Block Website Dialog**: User-friendly interface for creating blocks
2. **Blocked Websites Table**: Management interface for viewing and managing blocks
3. **Device Integration**: Block buttons integrated into device tables
4. **Real-time Status**: Live updates of blocking status and firewall synchronization

## Key Features

### Multi-Firewall Support
- **pfSense**: SSH-based rule management with pfctl integration
- **OpenWrt**: iptables and dnsmasq configuration via SSH
- **FortiGate**: API-based policy management
- **Simulation Mode**: Demo-friendly mock firewall for testing

### Block Types
- **Domain Blocking**: Blocks entire domains and subdomains
- **URL Blocking**: Blocks specific URLs or paths
- **IP Blocking**: Blocks specific IP addresses

### Status Tracking
- **Pending**: Block request created, awaiting firewall processing
- **Active**: Successfully applied to firewall
- **Failed**: Error occurred during firewall configuration
- **Removed**: Block has been removed from firewall

## Usage Instructions

### Blocking a Website

1. Navigate to the Devices page in your ITAM dashboard
2. Find the device you want to apply blocking to
3. Click the red Shield icon or use the dropdown menu "Block Website"
4. Enter the domain/URL to block (e.g., facebook.com, youtube.com)
5. Select the block type (Domain, URL, or IP)
6. Provide a reason for the block
7. Submit the request

The system will:
- Create a database record
- Attempt to apply the firewall rule
- Update the status in real-time
- Log all actions for audit purposes

### Managing Blocked Websites

Access the blocked websites management through:
- Device-specific view: Shows blocks for individual devices
- Global view: Shows all blocks across the network
- History tracking: View complete lifecycle of each block
- Bulk operations: Remove multiple blocks simultaneously

### Firewall Integration

#### Real Network Environment
Configure your firewall credentials in the system:
```javascript
const firewallConfig = {
  type: "pfsense", // or "openwrt", "fortigate"
  host: "192.168.1.1",
  username: "admin",
  password: "your_password",
  api_key: "your_api_key" // for FortiGate
};
```

#### Demo/Simulation Mode
For testing and demonstration, the system uses a simulated firewall that:
- Mimics real firewall behavior
- Shows realistic success/failure rates (90% success)
- Provides detailed status updates
- Demonstrates rule application without network changes

## API Reference

### Create Website Block
```http
POST /api/website-blocks
Content-Type: application/json

{
  "deviceId": 123,
  "targetDomain": "facebook.com",
  "blockType": "domain",
  "reason": "Productivity policy",
  "createdBy": "admin"
}
```

### Get Device Blocks
```http
GET /api/website-blocks/device/123
```

### Remove Block
```http
DELETE /api/website-blocks/456
Content-Type: application/json

{
  "performedBy": "admin"
}
```

### Check Firewall Status
```http
GET /api/firewall/status
```

## Integration Examples

### pfSense Integration
```python
# Automatic rule creation
firewall = PfSenseFirewall(
    host="192.168.1.1",
    username="admin", 
    password="password"
)

success, message, rule = firewall.block_domain(
    device_ip="192.168.1.100",
    domain="facebook.com",
    rule_name="block_facebook_device100"
)
```

### OpenWrt Integration
```python
# iptables and dnsmasq configuration
firewall = OpenWrtFirewall(
    host="192.168.1.1",
    username="root",
    password="password"
)

# Creates both DNS blackhole and traffic blocking
firewall.block_domain("192.168.1.100", "youtube.com", "block_youtube")
```

### FortiGate Integration
```python
# Policy-based blocking via API
firewall = FortiGateFirewall(
    host="192.168.1.1",
    api_key="your_api_key"
)

# Creates address object and firewall policy
firewall.block_domain("192.168.1.100", "twitter.com", "social_media_block")
```

## Security Considerations

### Access Control
- Role-based permissions for creating/removing blocks
- Audit logging of all blocking actions
- Admin approval workflows for sensitive domains

### Network Security
- Encrypted communication with firewalls
- Secure credential storage
- Firewall rule validation before application

### Compliance
- Complete audit trail of all blocking decisions
- Reason tracking for policy compliance
- Historical reporting for regulatory requirements

## Troubleshooting

### Common Issues

**Block Status Stuck on "Pending"**
- Check firewall connectivity
- Verify credentials are correct
- Review firewall logs for errors

**Failed to Apply Rule**
- Network connectivity issues
- Firewall configuration conflicts
- Invalid domain/IP format

**Block Not Taking Effect**
- DNS cache may need clearing on client devices
- Firewall rule order may need adjustment
- Check if device is using alternative DNS servers

### Diagnostic Commands

Check firewall connection:
```bash
curl -X GET http://localhost:5000/api/firewall/status
```

Test block creation:
```bash
curl -X POST http://localhost:5000/api/website-blocks \
  -H "Content-Type: application/json" \
  -d '{"deviceId":123,"targetDomain":"test.com","createdBy":"admin"}'
```

View block status:
```bash
curl -X GET http://localhost:5000/api/website-blocks/device/123
```

## Production Deployment

### Firewall Setup
1. Configure firewall API access or SSH credentials
2. Test connectivity from ITAM server to firewall
3. Create backup of firewall configuration
4. Implement rule naming conventions

### Dashboard Configuration
1. Update firewall integration settings
2. Configure user permissions and roles
3. Set up monitoring and alerting
4. Implement backup and recovery procedures

This network-based website blocking system provides enterprise-grade web filtering capabilities integrated directly into your ITAM dashboard, enabling centralized control over network access policies.