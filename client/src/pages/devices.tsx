import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Device } from "@shared/schema";
import DeviceTable from "@/components/devices/device-table";
import AddDeviceDialog from "@/components/devices/add-device-dialog";
import EditDeviceDialog from "@/components/devices/edit-device-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Devices = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  
  // Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ['/api/devices'],
    queryFn: getQueryFn<Device[]>({ on401: "throw" })
  });

  // Handle edit device
  const handleEditDevice = (device: Device) => {
    setSelectedDevice(device);
    setIsEditDialogOpen(true);
  };

  // Handle delete device
  const handleDeleteIntent = (id: number) => {
    const device = queryClient.getQueryData<Device[]>(['/api/devices'])?.find(d => d.id === id);
    if (device) {
      setSelectedDevice(device);
      setIsDeleteDialogOpen(true);
    }
  };

  // Delete mutation
  const { mutate: deleteDevice, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/devices/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Device deleted",
        description: "The device has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete device: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle view device details
  const handleViewDeviceDetails = (device: Device) => {
    setSelectedDevice(device);
    setIsDetailsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Device Inventory</h1>
          <p className="text-gray-500">Manage and monitor your organization's IT assets</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-[#4299E1] hover:bg-[#4299E1]/80 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      </div>

      {/* View selector tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          {['All', 'Workstations', 'Servers', 'Network Devices', 'Mobile Devices'].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "border-b-2 py-3 px-1 font-medium text-sm transition-colors",
                activeCategory === category 
                  ? "border-[#4299E1] text-[#4299E1]" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {category}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and filter bar */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-4 flex items-center justify-between">
        <div className="w-96">
          {/* Search input is in the DeviceTable component */}
        </div>
      </div>

      {/* Device table */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <DeviceTable 
          onEditDevice={handleEditDevice}
          onDeleteDevice={handleDeleteIntent}
          onViewDeviceDetails={handleViewDeviceDetails}
          categoryFilter={activeCategory}
        />
      </div>

      {/* Add device dialog */}
      <AddDeviceDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />

      {/* Edit device dialog */}
      <EditDeviceDialog 
        device={selectedDevice} 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the device "{selectedDevice?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedDevice && deleteDevice(selectedDevice.id)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device details dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Name</h4>
                  <p>{selectedDevice.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Model</h4>
                  <p>{selectedDevice.model}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Type</h4>
                  <p>{selectedDevice.type}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p>{selectedDevice.status}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Location</h4>
                  <p>{selectedDevice.location}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">IP Address</h4>
                  <p>{selectedDevice.ipAddress || "N/A"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Latitude</h4>
                  <p>{selectedDevice.latitude || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Longitude</h4>
                  <p>{selectedDevice.longitude || "N/A"}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Last Updated</h4>
                <p>{selectedDevice.lastUpdated ? new Date(selectedDevice.lastUpdated as any).toLocaleString() : "N/A"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
