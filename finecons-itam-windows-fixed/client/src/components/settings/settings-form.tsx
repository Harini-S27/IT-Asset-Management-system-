import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  Save, 
  Upload, 
  Building, 
  Clock, 
  Globe, 
  Mail, 
  Map,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for roles
const permissions = [
  { resource: "Dashboard", admin: true, manager: true, viewer: true },
  { resource: "Devices - View", admin: true, manager: true, viewer: true },
  { resource: "Devices - Add", admin: true, manager: true, viewer: false },
  { resource: "Devices - Edit", admin: true, manager: true, viewer: false },
  { resource: "Devices - Delete", admin: true, manager: false, viewer: false },
  { resource: "Maps", admin: true, manager: true, viewer: true },
  { resource: "User Management", admin: true, manager: false, viewer: false },
  { resource: "Settings", admin: true, manager: false, viewer: false },
];

// Organization Form
export function OrganizationForm() {
  const { toast } = useToast();
  
  // Try to load saved org settings from localStorage if available
  const loadSavedSettings = () => {
    try {
      const savedSettings = localStorage.getItem('orgSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error("Error loading saved organization settings:", error);
    }
    
    // Default values if no saved settings exist
    return {
      name: "Acme Corporation",
      logo: null as string | null,
      address: "123 Tech Blvd, San Francisco, CA 94107",
      phone: "+1 (555) 123-4567",
      website: "https://acme.example.com"
    };
  };
  
  const [orgSettings, setOrgSettings] = useState(loadSavedSettings());
  const [isSaving, setIsSaving] = useState(false);
  
  // Announce changes to parent component and save to localStorage
  useEffect(() => {
    // Dispatch event for the settings page to know changes were made
    const changeEvent = new CustomEvent('settings-changed');
    window.dispatchEvent(changeEvent);
    
    // Save the current settings to localStorage
    try {
      localStorage.setItem('orgSettings', JSON.stringify(orgSettings));
    } catch (error) {
      console.error("Error saving organization settings:", error);
    }
  }, [orgSettings]);
  
  // Listen for reset events from parent
  useEffect(() => {
    const handleReset = () => {
      setOrgSettings({
        name: "Acme Corporation",
        logo: null,
        address: "123 Tech Blvd, San Francisco, CA 94107",
        phone: "+1 (555) 123-4567",
        website: "https://acme.example.com"
      });
      
      toast({
        title: "Organization Settings Reset",
        description: "Organization information has been reset to default values."
      });
    };
    
    window.addEventListener('settings-reset', handleReset);
    return () => {
      window.removeEventListener('settings-reset', handleReset);
    };
  }, [toast]);

  // Keep track of which fields have been modified
  const [modifiedFields, setModifiedFields] = useState<Record<string, boolean>>({});
  
  // Debounced auto-save for better UX
  const [debounceSaveTimeout, setDebounceSaveTimeout] = useState<number | null>(null);
  
  const handleOrgSettingChange = (field: string, value: string) => {
    // Update the field value
    setOrgSettings((prev: Record<string, any>) => ({ ...prev, [field]: value }));
    
    // Mark this field as modified
    setModifiedFields((prev: Record<string, boolean>) => ({ ...prev, [field]: true }));
    
    // Set up debounced save (auto-save after 1 second of inactivity)
    if (debounceSaveTimeout) {
      window.clearTimeout(debounceSaveTimeout);
    }
    
    const timeoutId = window.setTimeout(() => {
      // Show a tiny feedback toast
      toast({
        title: "Field Updated",
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} has been updated.`,
        duration: 2000
      });
      
      // Reset the modified status for this field after saving
      setModifiedFields((prev: Record<string, boolean>) => ({ ...prev, [field]: false }));
    }, 1000);
    
    setDebounceSaveTimeout(timeoutId as unknown as number);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        // Check file size (limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: "Logo image must be less than 2MB in size.",
            variant: "destructive"
          });
          return;
        }
        
        // Create preview URL
        const logoUrl = URL.createObjectURL(file);
        setOrgSettings((prev: Record<string, any>) => ({ ...prev, logo: logoUrl }));
        
        toast({
          title: "Logo Uploaded",
          description: "Your organization logo has been updated."
        });
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your logo. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Information</CardTitle>
        <CardDescription>Manage your organization details and branding</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="relative">
                <Label htmlFor="org-name">Organization Name</Label>
                <div className="relative">
                  <Input 
                    id="org-name" 
                    value={orgSettings.name} 
                    onChange={(e) => handleOrgSettingChange('name', e.target.value)} 
                    className={modifiedFields.name ? "border-blue-500 pr-8" : ""}
                  />
                  {modifiedFields.name && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500">
                      <span className="bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded">Saving...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <Label htmlFor="org-address">Address</Label>
                <div className="relative">
                  <Input 
                    id="org-address" 
                    value={orgSettings.address} 
                    onChange={(e) => handleOrgSettingChange('address', e.target.value)} 
                    className={modifiedFields.address ? "border-blue-500 pr-8" : ""}
                  />
                  {modifiedFields.address && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500">
                      <span className="bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded">Saving...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <Label htmlFor="org-phone">Phone Number</Label>
                <div className="relative">
                  <Input 
                    id="org-phone" 
                    value={orgSettings.phone} 
                    onChange={(e) => handleOrgSettingChange('phone', e.target.value)} 
                    className={modifiedFields.phone ? "border-blue-500 pr-8" : ""}
                  />
                  {modifiedFields.phone && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500">
                      <span className="bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded">Saving...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <Label htmlFor="org-website">Website</Label>
                <div className="relative">
                  <Input 
                    id="org-website" 
                    value={orgSettings.website} 
                    onChange={(e) => handleOrgSettingChange('website', e.target.value)} 
                    className={modifiedFields.website ? "border-blue-500 pr-8" : ""}
                  />
                  {modifiedFields.website && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500">
                      <span className="bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded">Saving...</span>
                    </div>
                  )} 
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-6">
              <div className="mb-4 w-32 h-32 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden relative">
                {orgSettings.logo ? (
                  <>
                    <img 
                      src={orgSettings.logo} 
                      alt="Organization Logo" 
                      className="w-full h-full object-contain" 
                    />
                    <button
                      type="button"
                      className="absolute bottom-1 right-1 h-6 w-6 rounded-full p-0 bg-red-500 text-white hover:bg-red-600"
                      onClick={() => {
                        setOrgSettings((prev: Record<string, any>) => ({ ...prev, logo: null }));
                        toast({
                          title: "Logo Removed",
                          description: "Your organization logo has been removed."
                        });
                      }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <Building className="h-16 w-16 text-gray-400" />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
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
  );
}

// System Preferences Form
export function SystemPreferencesForm() {
  const [preferences, setPreferences] = useState({
    defaultView: "table",
    timeZone: "America/Los_Angeles",
    dateFormat: "MM/DD/YYYY",
    language: "en-US",
    darkMode: false,
    autoRefresh: true,
    sessionTimeout: "30"
  });

  const handleChange = (field: string, value: string | boolean) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  return (
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
                value={preferences.defaultView} 
                onValueChange={(value) => handleChange('defaultView', value)}
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
                value={preferences.timeZone} 
                onValueChange={(value) => handleChange('timeZone', value)}
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
                value={preferences.dateFormat} 
                onValueChange={(value) => handleChange('dateFormat', value)}
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
                value={preferences.language} 
                onValueChange={(value) => handleChange('language', value)}
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
                  <Label htmlFor="toggle-dark-mode" className="text-sm">Enable Dark Mode</Label>
                  <p className="text-xs text-gray-500">Allow users to toggle between light and dark themes</p>
                </div>
                <Switch 
                  id="toggle-dark-mode"
                  checked={preferences.darkMode} 
                  onCheckedChange={(checked) => {
                    handleChange('darkMode', checked);
                    // Apply dark mode effect immediately for demonstration
                    document.documentElement.classList.toggle('dark', checked);
                  }} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-auto-refresh" className="text-sm">Auto-refresh Dashboard</Label>
                  <p className="text-xs text-gray-500">Automatically refresh dashboard data every 5 minutes</p>
                </div>
                <Switch 
                  id="toggle-auto-refresh"
                  checked={preferences.autoRefresh} 
                  onCheckedChange={(checked) => handleChange('autoRefresh', checked)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Session Timeout</Label>
                  <p className="text-xs text-gray-500">Automatically log out users after inactivity</p>
                </div>
                <Select 
                  value={preferences.sessionTimeout}
                  onValueChange={(value) => handleChange('sessionTimeout', value)}
                >
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
  );
}

// Notification Settings Form
export function NotificationForm() {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    deviceDown: true,
    locationChange: true,
    maintenanceReminder: true,
    securityAlerts: true,
    contactEmail: "alerts@company.com",
    deviceDownThreshold: "5"
  });

  const handleChange = (field: string, value: string | boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  return (
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
              checked={notifications.emailAlerts} 
              onCheckedChange={(checked) => handleChange('emailAlerts', checked)} 
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
                  checked={notifications.deviceDown} 
                  onCheckedChange={(checked) => handleChange('deviceDown', checked)}
                  disabled={!notifications.emailAlerts}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Location Change</Label>
                  <p className="text-xs text-gray-500">Alert when a device location changes</p>
                </div>
                <Switch 
                  checked={notifications.locationChange} 
                  onCheckedChange={(checked) => handleChange('locationChange', checked)}
                  disabled={!notifications.emailAlerts}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Maintenance Reminder</Label>
                  <p className="text-xs text-gray-500">Send reminders for scheduled maintenance</p>
                </div>
                <Switch 
                  checked={notifications.maintenanceReminder} 
                  onCheckedChange={(checked) => handleChange('maintenanceReminder', checked)}
                  disabled={!notifications.emailAlerts}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Security Alerts</Label>
                  <p className="text-xs text-gray-500">Alert on suspicious login attempts</p>
                </div>
                <Switch 
                  checked={notifications.securityAlerts} 
                  onCheckedChange={(checked) => handleChange('securityAlerts', checked)}
                  disabled={!notifications.emailAlerts}
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
                  value={notifications.contactEmail} 
                  onChange={(e) => handleChange('contactEmail', e.target.value)} 
                  disabled={!notifications.emailAlerts}
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
                  value={notifications.deviceDownThreshold} 
                  onChange={(e) => handleChange('deviceDownThreshold', e.target.value)} 
                  disabled={!notifications.emailAlerts || !notifications.deviceDown}
                />
                <p className="text-xs text-gray-500 mt-1">Wait this many minutes before sending a down alert</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Map Preferences Form
export function MapPreferencesForm() {
  const { toast } = useToast();
  
  // Load existing map preferences from localStorage or use defaults
  const getInitialSettings = () => {
    try {
      const savedPrefs = localStorage.getItem('mapPreferences');
      if (savedPrefs) {
        return JSON.parse(savedPrefs);
      }
    } catch (e) {
      console.error("Error loading map preferences:", e);
    }
    
    // Default settings
    return {
      defaultZoom: "2", // World view by default
      enableClustering: false,
      satelliteView: false,
      showInactiveDevices: true,
      autoFocus: true,
      refreshInterval: "60"
    };
  };

  const [mapSettings, setMapSettings] = useState(getInitialSettings());
  const [saveStatus, setSaveStatus] = useState<{[key: string]: boolean}>({});

  const handleChange = (field: string, value: string | boolean) => {
    // Update local state
    setMapSettings(prev => ({ ...prev, [field]: value }));
    
    // Show saving indicator
    setSaveStatus(prev => ({ ...prev, [field]: true }));
    
    // Save to localStorage
    setTimeout(() => {
      try {
        const updatedSettings = { ...mapSettings, [field]: value };
        localStorage.setItem('mapPreferences', JSON.stringify(updatedSettings));
        
        // Notify success
        toast({
          title: "Setting updated",
          description: "Map preference has been saved",
          duration: 2000
        });
        
        // Clear saving indicator after a moment
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [field]: false }));
        }, 1000);
        
        // Dispatch custom event to notify map component
        window.dispatchEvent(new CustomEvent('mapPreferencesChanged'));
      } catch (error) {
        console.error("Error saving map preferences:", error);
        toast({
          title: "Error saving setting",
          description: "Please try again",
          variant: "destructive"
        });
        setSaveStatus(prev => ({ ...prev, [field]: false }));
      }
    }, 300);
  };

  return (
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
                value={mapSettings.defaultZoom} 
                onValueChange={(value) => handleChange('defaultZoom', value)}
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
                value={mapSettings.refreshInterval} 
                onChange={(e) => handleChange('refreshInterval', e.target.value)} 
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
                  checked={mapSettings.enableClustering} 
                  onCheckedChange={(checked) => handleChange('enableClustering', checked)} 
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Enable Satellite View</Label>
                  <p className="text-xs text-gray-500">Show satellite imagery instead of street map</p>
                </div>
                <Switch 
                  checked={mapSettings.satelliteView} 
                  onCheckedChange={(checked) => handleChange('satelliteView', checked)} 
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Show Inactive Devices</Label>
                  <p className="text-xs text-gray-500">Display inactive devices on the map</p>
                </div>
                <Switch 
                  checked={mapSettings.showInactiveDevices} 
                  onCheckedChange={(checked) => handleChange('showInactiveDevices', checked)} 
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Auto-Focus on Selection</Label>
                  <p className="text-xs text-gray-500">Automatically zoom to selected devices</p>
                </div>
                <Switch 
                  checked={mapSettings.autoFocus} 
                  onCheckedChange={(checked) => handleChange('autoFocus', checked)} 
                />
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
  );
}

// Access Control Form
export function AccessControlForm() {
  const { toast } = useToast();
  const [permissionsList, setPermissionsList] = useState(permissions);

  const togglePermission = (index: number, role: 'admin' | 'manager' | 'viewer', checked: boolean) => {
    const newPermissions = [...permissionsList];
    newPermissions[index][role] = checked;
    setPermissionsList(newPermissions);
    
    // Emit event to notify parent that settings changed
    const event = new CustomEvent('settings-changed');
    window.dispatchEvent(event);
    
    // Show feedback toast
    toast({
      title: "Permission Updated",
      description: `${role.charAt(0).toUpperCase() + role.slice(1)} access to ${newPermissions[index].resource} ${checked ? 'enabled' : 'disabled'}`,
      duration: 2000
    });
  };

  const isDisabled = (resource: string, role: 'admin' | 'manager' | 'viewer') => {
    // Dashboard access is required for all roles
    if (resource === "Dashboard") return true;
    
    // Admin always has full access to User Management and Settings
    if (role === "admin" && (resource === "User Management" || resource === "Settings")) return true;
    
    return false;
  };

  return (
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
              {permissionsList.map((permission, index) => (
                <TableRow key={`permission-${index}`}>
                  <TableCell className="font-medium">{permission.resource}</TableCell>
                  <TableCell className="text-center">
                    <Switch 
                      checked={permission.admin} 
                      onCheckedChange={(checked) => togglePermission(index, 'admin', checked)} 
                      disabled={isDisabled(permission.resource, 'admin')}
                      className="data-[state=checked]:bg-red-600"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch 
                      checked={permission.manager} 
                      onCheckedChange={(checked) => togglePermission(index, 'manager', checked)} 
                      disabled={isDisabled(permission.resource, 'manager')}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch 
                      checked={permission.viewer} 
                      onCheckedChange={(checked) => togglePermission(index, 'viewer', checked)} 
                      disabled={isDisabled(permission.resource, 'viewer')}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-500">
          <p>* Changes to role permissions will be applied to all users with that role.</p>
          <p>* Some permissions are required for specific roles and cannot be modified.</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span>Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span>Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span>Viewer</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Save Settings Button
export function SaveSettingsButton() {
  const { toast } = useToast();
  
  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been successfully saved.",
    });
  };
  
  return (
    <Button 
      onClick={handleSave}
      className="bg-[#48BB78] hover:bg-[#48BB78]/90"
    >
      <Save className="h-4 w-4 mr-2" />
      Save Changes
    </Button>
  );
}