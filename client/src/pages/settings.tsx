import React, { useState } from "react";
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
  Save
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

// Mock user data for the User Management tab
const mockUsers = [
  { id: 1, name: "Admin User", email: "admin@company.com", role: "Admin", status: "Active", lastLogin: "Today at 09:45 AM" },
  { id: 2, name: "John Manager", email: "john@company.com", role: "Manager", status: "Active", lastLogin: "Yesterday at 06:23 PM" },
  { id: 3, name: "Jane Viewer", email: "jane@company.com", role: "Viewer", status: "Inactive", lastLogin: "May 15, 2025 at 11:30 AM" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("user-management");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track form changes
  React.useEffect(() => {
    // In a real app, this would compare current vs initial state
    setHasChanges(true);
  }, [activeTab]);
  
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
  
  const handleResetSettings = () => {
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to their default values.",
    });
    
    // In a real application, this would reset the form values
    // Reset could be implemented per-form by passing callback functions to each form component
    
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Settings</h1>
          <p className="text-gray-500">Manage your organization preferences and system settings</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleResetSettings}
            disabled={!hasChanges}
          >
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