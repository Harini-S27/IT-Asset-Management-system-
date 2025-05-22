import React, { useState, createContext, useContext } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Shield, 
  Building, 
  Settings as SettingsIcon, 
  Bell, 
  Map,
  Save,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  OrganizationForm,
  SystemPreferencesForm,
  NotificationForm,
  MapPreferencesForm,
  AccessControlForm,
  SaveSettingsButton
} from "@/components/settings/settings-form";

// Default settings values
const defaultSettings = {
  // Access Control defaults
  permissions: {
    dashboard: { admin: true, manager: true, viewer: true },
    devicesView: { admin: true, manager: true, viewer: true },
    devicesAdd: { admin: true, manager: true, viewer: false },
    devicesEdit: { admin: true, manager: true, viewer: false },
    devicesDelete: { admin: true, manager: false, viewer: false },
    maps: { admin: true, manager: true, viewer: true },
    userManagement: { admin: true, manager: false, viewer: false },
    settings: { admin: true, manager: false, viewer: false },
  },
  
  // System preferences defaults
  systemPreferences: {
    defaultView: "table",
    timeZone: "America/Los_Angeles",
    dateFormat: "MM/DD/YYYY",
    language: "en-US",
    darkMode: false,
    autoRefresh: true,
    sessionTimeout: "30"
  },
  
  // Organization defaults
  organization: {
    name: "Acme Corporation",
    logo: null,
    address: "123 Tech Blvd, San Francisco, CA 94107",
    phone: "+1 (555) 123-4567",
    website: "https://acme.example.com"
  },
  
  // Notification defaults
  notifications: {
    emailAlerts: true,
    deviceDown: true,
    locationChange: true,
    maintenanceReminder: true,
    securityAlerts: true,
    contactEmail: "alerts@company.com",
    deviceDownThreshold: "5"
  },
  
  // Map preferences defaults
  mapPreferences: {
    defaultLocation: { lat: 37.7749, lng: -122.4194 },
    defaultZoom: 10,
    clusterMarkers: true,
    showOfflineDevices: true,
    mapStyle: "standard"
  }
};

// Mock user data for the User Management tab
const mockUsers = [
  { id: 1, name: "Admin User", email: "admin@company.com", role: "Admin", status: "Active", lastLogin: "Today at 09:45 AM" },
  { id: 2, name: "John Manager", email: "john@company.com", role: "Manager", status: "Active", lastLogin: "Yesterday at 06:23 PM" },
  { id: 3, name: "Jane Viewer", email: "jane@company.com", role: "Viewer", status: "Inactive", lastLogin: "May 15, 2025 at 11:30 AM" },
];

// Create Settings Context
const SettingsContext = createContext<{
  settings: typeof defaultSettings;
  setSettings: React.Dispatch<React.SetStateAction<typeof defaultSettings>>;
  resetSettings: () => void;
}>({
  settings: defaultSettings,
  setSettings: () => {},
  resetSettings: () => {},
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("user-management");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Main settings state
  const [settings, setSettings] = useState({...defaultSettings});
  
  // Track form changes
  React.useEffect(() => {
    // In a real app, this would compare current vs initial state
    setHasChanges(true);
  }, [activeTab, settings]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleSaveSettings = () => {
    setHasChanges(false);
    toast({
      title: "Settings Saved",
      description: "Your changes have been successfully saved.",
    });
  };
  
  const resetSettings = () => {
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to their default values.",
    });
    
    // Reset all settings to their default values
    setSettings({...defaultSettings});
    
    // For this demo, we'll add a brief timeout to simulate the reset
    setTimeout(() => {
      // Set hasChanges to true to allow saving after reset
      setHasChanges(true);
      toast({
        title: "Reset Complete",
        description: "Settings have been restored to default values. You can now save these changes.",
      });
    }, 500);
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings, resetSettings }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#1A202C]">Settings</h1>
            <p className="text-gray-500">Manage your organization preferences and system settings</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => resetSettings()}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSaveSettings}
              className="bg-[#48BB78] hover:bg-[#48BB78]/90"
              disabled={!hasChanges}
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
          {/* Use UserManagementForm component here */}
          {/* For now, we'll use the AccessControlForm as a placeholder */}
          <AccessControlForm />
        </TabsContent>

        {/* Role & Access Control Tab */}
        <TabsContent value="role-access">
          <AccessControlForm />
        </TabsContent>

        {/* Organization Info Tab */}
        <TabsContent value="organization">
          <OrganizationForm />
        </TabsContent>

        {/* System Preferences Tab */}
        <TabsContent value="system">
          <SystemPreferencesForm />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationForm />
        </TabsContent>

        {/* Map Preferences Tab */}
        <TabsContent value="map">
          <MapPreferencesForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}