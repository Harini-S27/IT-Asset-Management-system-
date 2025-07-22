import React, { useState, useEffect } from "react";
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
  Save,
  RotateCcw,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserManagement } from "@shared/schema";
import {
  OrganizationForm,
  SystemPreferencesForm,
  NotificationForm,
  AccessControlForm,
} from "@/components/settings/settings-form";
import { AddUserDialog } from "@/components/user-management/add-user-dialog";
import { EditUserDialog } from "@/components/user-management/edit-user-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("user-management");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // User Management state
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);

  // Fetch users for user management
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/user-management"],
    queryFn: async () => {
      const response = await fetch("/api/user-management");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/user-management/${userId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      
      // DELETE requests typically don't return content
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-management"] });
      toast({
        title: "Success",
        description: "User has been deleted successfully"
      });
      setDeleteUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  });
  
  // This is a simpler, more reliable approach to resetting the form
  const [resetCounter, setResetCounter] = useState(0);
  
  // Create a global context for tracking changes across all settings forms
  const [formStates, setFormStates] = useState<Record<string, Record<string, any>>>({
    organization: {},
    system: {},
    notifications: {},
    map: {},
    access: {}
  });
  
  // Track if any changes were made
  useEffect(() => {
    // Always consider changes present for demonstration purposes
    setHasChanges(true);
    
    // Listen for form changes from child components
    const handleSettingsChanged = (e: CustomEvent) => {
      setHasChanges(true);
    };
    
    window.addEventListener('settings-changed' as any, handleSettingsChanged);
    
    return () => {
      window.removeEventListener('settings-changed' as any, handleSettingsChanged);
    };
  }, [activeTab]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleSaveSettings = () => {
    // Show saving state
    setIsSaving(true);
    
    // Simulate API call to save settings
    setTimeout(() => {
      // Apply any changes to localStorage for persistence (in a real app, this would save to API)
      try {
        // Store each settings tab's state in localStorage
        Object.keys(formStates).forEach(key => {
          const formData = formStates[key as keyof typeof formStates];
          if (Object.keys(formData).length > 0) {
            localStorage.setItem(`settings_${key}`, JSON.stringify(formData));
          }
        });
        
        // Dispatch event for child components to update their "original" state
        const saveEvent = new CustomEvent('settings-saved');
        window.dispatchEvent(saveEvent);
        
        toast({
          title: "Settings Saved",
          description: "Your changes have been successfully saved.",
        });
      } catch (error) {
        console.error("Error saving settings:", error);
        toast({
          title: "Error Saving Settings",
          description: "There was a problem saving your settings. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSaving(false);
        setHasChanges(false);
      }
    }, 800); // Simulate a network delay
  };
  
  const handleResetSettings = () => {
    // Show resetting state
    setIsResetting(true);
    
    // Show toast to indicate reset is happening
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to their default values.",
    });
    
    // Actually clear localStorage settings values (for demonstration)
    try {
      Object.keys(formStates).forEach(key => {
        localStorage.removeItem(`settings_${key}`);
      });
      
      // Reset form states to empty objects
      setFormStates({
        organization: {},
        system: {},
        notifications: {},
        map: {},
        access: {}
      });
      
      // Increment the reset counter to force reload of all form components
      setResetCounter(prev => prev + 1);
      
      // Dispatch event for child components to reset their state
      const resetEvent = new CustomEvent('settings-reset');
      window.dispatchEvent(resetEvent);
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast({
        title: "Error Resetting Settings",
        description: "There was a problem resetting your settings. Please try again.",
        variant: "destructive"
      });
    }
    
    // Simulate API call completion
    setTimeout(() => {
      setIsResetting(false);
      
      // Keep save button enabled after reset
      setHasChanges(true);
      
      // Show confirmation
      toast({
        title: "Reset Complete",
        description: "Settings have been restored to default values. You can now save these changes.",
      });
    }, 800); // Simulate a network delay
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
            disabled={!hasChanges || isSaving || isResetting}
          >
            {isResetting ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </>
            )}
          </Button>
          <Button 
            onClick={handleSaveSettings}
            className="bg-[#48BB78] hover:bg-[#48BB78]/90"
            disabled={!hasChanges || isSaving || isResetting}
          >
            {isSaving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
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

        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="user-management">
          <div className="rounded-md border">
            <div className="p-4 bg-white rounded-md shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Users</h3>
                <Button 
                  className="bg-[#48BB78] hover:bg-[#48BB78]/90"
                  onClick={() => setAddUserDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
              
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found. Click "Add User" to create the first user.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Email</th>
                        <th className="px-4 py-2 text-left font-medium">Role</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                        <th className="px-4 py-2 text-left font-medium">Last Login</th>
                        <th className="px-4 py-2 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user: UserManagement) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{user.name}</td>
                          <td className="px-4 py-3">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'Admin' ? 'bg-rose-100 text-rose-800' :
                              user.role === 'Manager' ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() + " at " + new Date(user.lastLogin).toLocaleTimeString() : "Never"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditUserDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeleteUserDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Role & Access Control Tab */}
        <TabsContent value="role-access">
          <AccessControlForm key={`role-access-${resetCounter}`} />
        </TabsContent>

        {/* Organization Info Tab */}
        <TabsContent value="organization">
          <OrganizationForm key={`org-${resetCounter}`} />
        </TabsContent>

        {/* System Preferences Tab */}
        <TabsContent value="system">
          <SystemPreferencesForm key={`system-${resetCounter}`} />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationForm key={`notifications-${resetCounter}`} />
        </TabsContent>


      </Tabs>

      {/* User Management Dialogs */}
      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
      />

      <EditUserDialog
        open={editUserDialogOpen}
        onOpenChange={setEditUserDialogOpen}
        user={selectedUser}
      />

      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for {selectedUser?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}