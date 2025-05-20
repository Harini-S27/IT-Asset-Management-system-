import React, { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  UserPlus, 
  Users, 
  Shield, 
  Building, 
  Settings as SettingsIcon, 
  Bell, 
  Map, 
  Upload, 
  UserMinus, 
  Edit, 
  Save,
  Globe,
  Clock,
  Languages,
  Mail
} from "lucide-react";

// Mock user data
const mockUsers = [
  { id: 1, name: "Admin User", email: "admin@company.com", role: "Admin", status: "Active", lastLogin: "Today at 09:45 AM" },
  { id: 2, name: "John Manager", email: "john@company.com", role: "Manager", status: "Active", lastLogin: "Yesterday at 06:23 PM" },
  { id: 3, name: "Jane Viewer", email: "jane@company.com", role: "Viewer", status: "Inactive", lastLogin: "May 15, 2025 at 11:30 AM" },
];

const SettingsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("user-management");
  
  // State for roles and permissions
  const [permissions, setPermissions] = useState([
    { resource: "Dashboard", admin: true, manager: true, viewer: true },
    { resource: "Devices - View", admin: true, manager: true, viewer: true },
    { resource: "Devices - Add", admin: true, manager: true, viewer: false },
    { resource: "Devices - Edit", admin: true, manager: true, viewer: false },
    { resource: "Devices - Delete", admin: true, manager: false, viewer: false },
    { resource: "Maps", admin: true, manager: true, viewer: true },
    { resource: "User Management", admin: true, manager: false, viewer: false },
    { resource: "Settings", admin: true, manager: false, viewer: false },
  ]);
  
  const [orgSettings, setOrgSettings] = useState({
    name: "Acme Corporation",
    logo: null as string | null,
    address: "123 Tech Blvd, San Francisco, CA 94107",
    phone: "+1 (555) 123-4567",
    website: "https://acme.example.com"
  });

  const [systemPreferences, setSystemPreferences] = useState({
    defaultView: "table",
    timeZone: "America/Los_Angeles",
    dateFormat: "MM/DD/YYYY",
    language: "en-US"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    deviceDown: true,
    locationChange: true,
    maintenanceReminder: true,
    securityAlerts: true,
    contactEmail: "alerts@company.com",
    deviceDownThreshold: "5"
  });

  const [mapPreferences, setMapPreferences] = useState({
    defaultZoom: "10",
    enableClustering: true,
    satelliteView: false,
    showInactiveDevices: true,
    refreshInterval: "60"
  });

  // Handler for organization settings changes
  const handleOrgSettingChange = (field: string, value: string) => {
    setOrgSettings(prev => ({ ...prev, [field]: value }));
  };

  // Handler for system preferences changes
  const handleSystemPrefChange = (field: string, value: string | boolean) => {
    setSystemPreferences(prev => ({ ...prev, [field]: value }));
  };

  // Handler for notification settings changes
  const handleNotificationChange = (field: string, value: string | boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  // Handler for map preferences changes
  const handleMapPrefChange = (field: string, value: string | boolean) => {
    setMapPreferences(prev => ({ ...prev, [field]: value }));
  };

  // Handler for logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // In a real app, you would upload the file to a server
      // For now, we'll just set a placeholder
      const logoUrl = URL.createObjectURL(e.target.files[0]);
      setOrgSettings(prev => ({ ...prev, logo: logoUrl }));
    }
  };

  // Handler for saving settings
  const handleSaveSettings = () => {
    // In a real app, you would save to a database
    toast({
      title: "Settings Saved",
      description: "Your changes have been successfully saved.",
    });
  };

  // Handler for changing tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handler for toggle permission
  const handlePermissionChange = (index: number, role: 'admin' | 'manager' | 'viewer', checked: boolean) => {
    const newPermissions = [...permissions];
    newPermissions[index][role] = checked;
    setPermissions(newPermissions);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Settings</h1>
          <p className="text-gray-500">Manage your organization preferences and system settings</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Reset</Button>
          <Button 
            onClick={handleSaveSettings}
            className="bg-[#48BB78] hover:bg-[#48BB78]/90"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-[#F7FAFC] border mb-6 grid grid-cols-6">
          <TabsTrigger value="user-management" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">User Management</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="role-access" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Role & Access</span>
            <span className="sm:hidden">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Organization</span>
            <span className="sm:hidden">Org</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center">
            <SettingsIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">System</span>
            <span className="sm:hidden">System</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center">
            <Map className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Map Preferences</span>
            <span className="sm:hidden">Map</span>
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="user-management">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and access levels</CardDescription>
              </div>
              <Button className="bg-[#4299E1] hover:bg-[#4299E1]/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select defaultValue={user.role}>
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {user.status}
                          </div>
                        </TableCell>
                        <TableCell>{user.lastLogin}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role & Access Control Tab */}
        <TabsContent value="role-access">
          <Card>
            <CardHeader>
              <CardTitle>Role & Access Control</CardTitle>
              <CardDescription>Configure permissions for each user role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource / Module</TableHead>
                      <TableHead className="text-center">Admin</TableHead>
                      <TableHead className="text-center">Manager</TableHead>
                      <TableHead className="text-center">Viewer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{permission.resource}</TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={permission.admin} 
                            onCheckedChange={(checked) => handlePermissionChange(index, 'admin', checked)} 
                            disabled={permission.resource === "Dashboard"} 
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={permission.manager} 
                            onCheckedChange={(checked) => handlePermissionChange(index, 'manager', checked)} 
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={permission.viewer} 
                            onCheckedChange={(checked) => handlePermissionChange(index, 'viewer', checked)} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>* Changes to role permissions will be applied to all users with that role.</p>
                <p>* Some permissions are required for specific roles and cannot be modified.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Info Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Manage your organization details and branding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input 
                        id="org-name" 
                        value={orgSettings.name} 
                        onChange={(e) => handleOrgSettingChange('name', e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-address">Address</Label>
                      <Input 
                        id="org-address" 
                        value={orgSettings.address} 
                        onChange={(e) => handleOrgSettingChange('address', e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-phone">Phone Number</Label>
                      <Input 
                        id="org-phone" 
                        value={orgSettings.phone} 
                        onChange={(e) => handleOrgSettingChange('phone', e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-website">Website</Label>
                      <Input 
                        id="org-website" 
                        value={orgSettings.website} 
                        onChange={(e) => handleOrgSettingChange('website', e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-6">
                    <div className="mb-4 w-32 h-32 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                      {orgSettings.logo ? (
                        <img 
                          src={orgSettings.logo} 
                          alt="Organization Logo" 
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <Building className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    <Label 
                      htmlFor="logo-upload" 
                      className="cursor-pointer bg-[#4299E1] text-white hover:bg-[#4299E1]/90 px-4 py-2 rounded-md flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Label>
                    <Input 
                      id="logo-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleLogoUpload}
                    />
                    <p className="text-xs text-gray-500 mt-2">Recommended: 512x512px PNG or SVG</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Preferences Tab */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>Configure system-wide settings and defaults</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="default-view">Default Device View</Label>
                    <Select 
                      value={systemPreferences.defaultView} 
                      onValueChange={(value) => handleSystemPrefChange('defaultView', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table View</SelectItem>
                        <SelectItem value="grid">Grid View</SelectItem>
                        <SelectItem value="map">Map View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Time Zone</Label>
                    <Select 
                      value={systemPreferences.timeZone} 
                      onValueChange={(value) => handleSystemPrefChange('timeZone', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="UTC">Universal Time (UTC)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1 text-gray-400" />
                      <p className="text-xs text-gray-500">Current time zone setting will be applied to all timestamps</p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select 
                      value={systemPreferences.dateFormat} 
                      onValueChange={(value) => handleSystemPrefChange('dateFormat', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={systemPreferences.language} 
                      onValueChange={(value) => handleSystemPrefChange('language', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center mt-1">
                      <Globe className="h-3 w-3 mr-1 text-gray-400" />
                      <p className="text-xs text-gray-500">Changes the interface language for all users</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Advanced Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Enable Dark Mode</Label>
                        <p className="text-xs text-gray-500">Allow users to toggle between light and dark themes</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Auto-refresh Dashboard</Label>
                        <p className="text-xs text-gray-500">Automatically refresh dashboard data every 5 minutes</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Session Timeout</Label>
                        <p className="text-xs text-gray-500">Automatically log out users after inactivity</p>
                      </div>
                      <Select defaultValue="30">
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Minutes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="60">60 min</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure alerts and notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Email Alerts</Label>
                    <p className="text-sm text-gray-500">Enable email notifications for alerts</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.emailAlerts} 
                    onCheckedChange={(checked) => handleNotificationChange('emailAlerts', checked)} 
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Alert Types</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Device Down</Label>
                        <p className="text-xs text-gray-500">Alert when a device becomes unreachable</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.deviceDown} 
                        onCheckedChange={(checked) => handleNotificationChange('deviceDown', checked)}
                        disabled={!notificationSettings.emailAlerts}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Location Change</Label>
                        <p className="text-xs text-gray-500">Alert when a device location changes</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.locationChange} 
                        onCheckedChange={(checked) => handleNotificationChange('locationChange', checked)}
                        disabled={!notificationSettings.emailAlerts}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Maintenance Reminder</Label>
                        <p className="text-xs text-gray-500">Send reminders for scheduled maintenance</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.maintenanceReminder} 
                        onCheckedChange={(checked) => handleNotificationChange('maintenanceReminder', checked)}
                        disabled={!notificationSettings.emailAlerts}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Security Alerts</Label>
                        <p className="text-xs text-gray-500">Alert on suspicious login attempts</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.securityAlerts} 
                        onCheckedChange={(checked) => handleNotificationChange('securityAlerts', checked)}
                        disabled={!notificationSettings.emailAlerts}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Alert Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="contact-email" className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        Contact Email
                      </Label>
                      <Input 
                        id="contact-email" 
                        type="email" 
                        value={notificationSettings.contactEmail} 
                        onChange={(e) => handleNotificationChange('contactEmail', e.target.value)} 
                        disabled={!notificationSettings.emailAlerts}
                      />
                      <p className="text-xs text-gray-500 mt-1">All alerts will be sent to this email address</p>
                    </div>
                    <div>
                      <Label htmlFor="device-threshold">Device Down Threshold (minutes)</Label>
                      <Input 
                        id="device-threshold" 
                        type="number" 
                        min="1" 
                        max="60" 
                        value={notificationSettings.deviceDownThreshold} 
                        onChange={(e) => handleNotificationChange('deviceDownThreshold', e.target.value)} 
                        disabled={!notificationSettings.emailAlerts || !notificationSettings.deviceDown}
                      />
                      <p className="text-xs text-gray-500 mt-1">Wait this many minutes before sending a down alert</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map Preferences Tab */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Map Preferences</CardTitle>
              <CardDescription>Configure how the asset map is displayed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="default-zoom">Default Zoom Level</Label>
                    <Select 
                      value={mapPreferences.defaultZoom} 
                      onValueChange={(value) => handleMapPrefChange('defaultZoom', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select zoom level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">Level 6 - Country</SelectItem>
                        <SelectItem value="8">Level 8 - Region</SelectItem>
                        <SelectItem value="10">Level 10 - City</SelectItem>
                        <SelectItem value="13">Level 13 - District</SelectItem>
                        <SelectItem value="15">Level 15 - Street</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Initial zoom level when the map is loaded</p>
                  </div>
                  <div>
                    <Label htmlFor="refresh-interval">Map Refresh Interval (seconds)</Label>
                    <Input 
                      id="refresh-interval" 
                      type="number" 
                      min="10" 
                      max="300" 
                      value={mapPreferences.refreshInterval} 
                      onChange={(e) => handleMapPrefChange('refreshInterval', e.target.value)} 
                    />
                    <p className="text-xs text-gray-500 mt-1">How often to refresh device locations on the map</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Map Display Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Enable Clustering</Label>
                        <p className="text-xs text-gray-500">Group nearby devices together on the map</p>
                      </div>
                      <Switch 
                        checked={mapPreferences.enableClustering} 
                        onCheckedChange={(checked) => handleMapPrefChange('enableClustering', checked)} 
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Enable Satellite View</Label>
                        <p className="text-xs text-gray-500">Show satellite imagery instead of street map</p>
                      </div>
                      <Switch 
                        checked={mapPreferences.satelliteView} 
                        onCheckedChange={(checked) => handleMapPrefChange('satelliteView', checked)} 
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Show Inactive Devices</Label>
                        <p className="text-xs text-gray-500">Display inactive devices on the map</p>
                      </div>
                      <Switch 
                        checked={mapPreferences.showInactiveDevices} 
                        onCheckedChange={(checked) => handleMapPrefChange('showInactiveDevices', checked)} 
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Auto-Focus on Selection</Label>
                        <p className="text-xs text-gray-500">Automatically zoom to selected devices</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-[#F0F9FF] rounded-md border border-[#BEE3F8]">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <Map className="h-5 w-5 text-[#3182CE]" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-[#2B6CB0]">Map Provider Information</h3>
                      <div className="mt-2 text-sm text-[#2C5282]">
                        <p>This application uses OpenStreetMap as the default map provider. Usage is subject to OpenStreetMap's terms and conditions.</p>
                        <p className="mt-1">For enterprise deployments with high traffic, we recommend upgrading to a commercial map provider.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;