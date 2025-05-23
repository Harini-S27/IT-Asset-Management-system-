import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Download, FileSpreadsheet, FileText, FileDown, ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Devices = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isExporting, setIsExporting] = useState(false);
  
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
  
  // Export functions
  const handleExport = (format: string) => {
    setIsExporting(true);
    
    try {
      // Get filtered devices based on active category
      const filteredDevices = activeCategory === 'All' 
        ? devices 
        : devices.filter(device => {
            if (activeCategory === 'Workstations') return device.type === 'Workstation';
            if (activeCategory === 'Servers') return device.type === 'Server';
            if (activeCategory === 'Network Devices') return device.type === 'Network';
            if (activeCategory === 'Mobile Devices') return device.type === 'Mobile' || device.type === 'Laptop';
            return true;
          });
      
      if (filteredDevices.length === 0) {
        toast({
          title: "No devices to export",
          description: "There are no devices matching your current filter.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }
      
      if (format === 'csv') {
        exportToCSV(filteredDevices);
      } else if (format === 'excel') {
        exportToExcel(filteredDevices);
      } else if (format === 'pdf') {
        exportToPDF(filteredDevices);
      } else if (format === 'json') {
        exportToJSON(filteredDevices);
      }
      
      toast({
        title: "Export successful",
        description: `Device inventory has been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the device inventory.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // CSV Export
  const exportToCSV = (devicesToExport: Device[]) => {
    // Define the headers
    const headers = ['ID', 'Name', 'Model', 'Type', 'Status', 'Location', 'IP Address', 'Last Updated'];
    
    // Map the device data to CSV rows
    const rows = devicesToExport.map(device => [
      device.id.toString(),
      device.name,
      device.model,
      device.type,
      device.status,
      device.location,
      device.ipAddress || 'N/A',
      device.lastUpdated ? new Date(device.lastUpdated as any).toLocaleString() : 'N/A'
    ]);
    
    // Combine headers and rows
    const csvData = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `device-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Excel Export
  const exportToExcel = (devicesToExport: Device[]) => {
    // For now, we'll use the CSV approach but change the extension
    // In a real-world scenario, you would use a library like xlsx for proper Excel files
    const headers = ['ID', 'Name', 'Model', 'Type', 'Status', 'Location', 'IP Address', 'Last Updated'];
    
    const rows = devicesToExport.map(device => [
      device.id.toString(),
      device.name,
      device.model,
      device.type,
      device.status,
      device.location,
      device.ipAddress || 'N/A',
      device.lastUpdated ? new Date(device.lastUpdated as any).toLocaleString() : 'N/A'
    ]);
    
    const csvData = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `device-inventory-${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // PDF Export
  const exportToPDF = (devicesToExport: Device[]) => {
    // Create a printable HTML version of the data
    let printContent = `
      <html>
        <head>
          <title>Device Inventory</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; }
            .date { margin-top: 8px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Device Inventory</h1>
            <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Model</th>
                <th>Type</th>
                <th>Status</th>
                <th>Location</th>
                <th>IP Address</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    devicesToExport.forEach(device => {
      printContent += `
        <tr>
          <td>${device.id}</td>
          <td>${device.name}</td>
          <td>${device.model}</td>
          <td>${device.type}</td>
          <td>${device.status}</td>
          <td>${device.location}</td>
          <td>${device.ipAddress || 'N/A'}</td>
          <td>${device.lastUpdated ? new Date(device.lastUpdated as any).toLocaleString() : 'N/A'}</td>
        </tr>
      `;
    });
    
    printContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = function() {
        printWindow.print();
        // printWindow.close(); // Uncomment to auto-close after print dialog
      };
    } else {
      alert('Please allow pop-ups to export as PDF');
    }
  };
  
  // JSON Export
  const exportToJSON = (devicesToExport: Device[]) => {
    const jsonString = JSON.stringify(devicesToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `device-inventory-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Device Inventory</h1>
          <p className="text-gray-500">Manage and monitor your organization's IT assets</p>
        </div>
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-[#4299E1]"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export <ChevronDown className="h-3 w-3 ml-2" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                <span>Excel (.xls)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                <span>CSV (.csv)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                <span>PDF (.pdf)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                <FileDown className="mr-2 h-4 w-4" />
                <span>JSON (.json)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
