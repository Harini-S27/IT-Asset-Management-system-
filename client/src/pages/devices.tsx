import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Plus, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileDown, 
  ChevronDown,
  Shield,
  Package,
  FileCheck,
  Clock,
  AlertTriangle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { Button } from "@/components/ui/button";
import { Device } from "@shared/schema";
import DeviceTable from "@/components/devices/device-table";
import AddDeviceDialog from "@/components/devices/add-device-dialog";
import EditDeviceDialog from "@/components/devices/edit-device-dialog";
import NetworkDiscoveryTable from "@/components/network/network-discovery-table";
import BlockedWebsitesTable from "@/components/website-blocking/blocked-websites-table";
import BlockWebsiteDialog from "@/components/website-blocking/block-website-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ProhibitedSoftwareSummary {
  totalProhibitedSoftware: number;
  totalDetections: number;
  activeThreats: number;
  devicesAffected: number;
}

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

  // Fetch prohibited software summary for audit dashboard
  const { data: prohibitedSummary } = useQuery<ProhibitedSoftwareSummary>({
    queryKey: ['/api/prohibited-software-summary'],
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

  // Audit and compliance data
  const auditSummaryData = [
    { status: 'Succeeded', count: 145 },
    { status: 'Failed', count: 23 },
    { status: 'Not Scanned', count: 67 },
    { status: 'In Progress', count: 12 },
  ];

  const osSummaryData = [
    { os: 'Windows 10', count: 89 },
    { os: 'Windows 11', count: 67 },
    { os: 'Windows Server', count: 34 },
    { os: 'Ubuntu', count: 28 },
    { os: 'macOS', count: 15 },
    { os: 'Windows 7', count: 8 },
    { os: 'Windows XP', count: 6 },
  ];

  const softwareSummary = {
    totalSoftware: 1247,
    commercialSoftware: 892,
    nonCommercialSoftware: 355,
    prohibitedSoftware: prohibitedSummary?.totalProhibitedSoftware || 8,
  };

  const complianceSummary = {
    licenseInCompliance: 734,
    overLicensed: 89,
    underLicensed: 45,
    expiredLicense: 24,
  };

  const warrantySummary = {
    warrantyInCompliance: 186,
    expiredWarranty: 43,
    unidentified: 18,
  };

  const prohibitedSoftwareData = {
    detected: prohibitedSummary?.totalDetections || 12,
    blocked: 8,
    recentActions: [
      { software: 'BitTorrent Client', action: 'Blocked', device: 'WS-001-DEV', time: '2 hours ago' },
      { software: 'Cryptocurrency Miner', action: 'Uninstalled', device: 'LT-045-MKT', time: '4 hours ago' },
      { software: 'TeamViewer Personal', action: 'Flagged', device: 'WS-012-FIN', time: '6 hours ago' },
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Device Management</h1>
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

      {/* Tabbed Interface */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inventory">Device Inventory</TabsTrigger>
          <TabsTrigger value="discovery">Network Discovery</TabsTrigger>
          <TabsTrigger value="blocking">Website Blocking</TabsTrigger>
          <TabsTrigger value="live">Live Devices</TabsTrigger>
          <TabsTrigger value="audit">Audit & Compliance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="space-y-6 mt-6">
          {/* View selector tabs */}
          <div className="border-b border-gray-200">
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

          {/* Device table */}
          <div className="bg-white rounded-lg shadow-sm">
            <DeviceTable 
              onEditDevice={handleEditDevice}
              onDeleteDevice={handleDeleteIntent}
              onViewDeviceDetails={handleViewDeviceDetails}
              categoryFilter={activeCategory}
            />
          </div>
        </TabsContent>

        <TabsContent value="discovery" className="space-y-6 mt-6">
          <NetworkDiscoveryTable />
        </TabsContent>

        <TabsContent value="blocking" className="space-y-6 mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Website Blocking</h2>
                <p className="text-gray-600">Manage network-level website blocks for devices</p>
              </div>
            </div>
            <BlockedWebsitesTable />
          </div>
        </TabsContent>

        <TabsContent value="live" className="space-y-6 mt-6">
          {/* Live Devices Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent-Reported Devices</CardTitle>
                <Shield className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {devices?.filter(d => d.location === "Agent-Reported" || d.location === "Remote Office").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Live monitoring active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Report</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">Live</div>
                <p className="text-xs text-muted-foreground">Real-time updates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{prohibitedSummary?.totalDetections || 0}</div>
                <p className="text-xs text-muted-foreground">By agent scanning</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Online</div>
                <p className="text-xs text-muted-foreground">Monitoring enabled</p>
              </CardContent>
            </Card>
          </div>

          {/* Live Device Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Agent Deployment Instructions
              </CardTitle>
              <CardDescription>
                Deploy the ITAM agent on company devices for real-time monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Step 1: Download Agent</h4>
                  <p className="text-sm text-muted-foreground">
                    Download agent.py and build_agent.bat from your project files
                  </p>
                  <Button variant="outline" size="sm" onClick={() => {
                    const content = `# Your Replit URL: ${window.location.origin}/api/device-update\n# Replace this in agent.py before building`;
                    navigator.clipboard.writeText(content);
                    toast({
                      title: "API URL copied",
                      description: "Paste this into agent.py before building",
                    });
                  }}>
                    Copy API URL
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Step 2: Build Executable</h4>
                  <p className="text-sm text-muted-foreground">
                    Run build_agent.bat to create itam-agent.exe
                  </p>
                  <Badge variant="secondary">Requires Python + PyInstaller</Badge>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Step 3: Deploy on Devices</h4>
                  <p className="text-sm text-muted-foreground">
                    Install itam-agent.exe on company laptops
                  </p>
                  <Badge variant="outline">Silent operation</Badge>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Step 4: Monitor Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    View real-time device reports and threat detection
                  </p>
                  <Badge variant="default">Live updates</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Device Table */}
          <Card>
            <CardHeader>
              <CardTitle>Live Device Reports</CardTitle>
              <CardDescription>
                Devices actively reporting through the agent system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceTable
                onEditDevice={handleEditDevice}
                onDeleteDevice={deleteDevice}
                onViewDeviceDetails={handleViewDeviceDetails}
                categoryFilter="Agent-Reported"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6 mt-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Computers</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-muted-foreground">Managed devices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audit Success Rate</CardTitle>
                <FileCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">89%</div>
                <p className="text-xs text-muted-foreground">Successfully audited</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Threats</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{prohibitedSummary?.activeThreats || 3}</div>
                <p className="text-xs text-muted-foreground">Active threats detected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">94%</div>
                <p className="text-xs text-muted-foreground">Overall compliance</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Computer Audit Summary</CardTitle>
                <CardDescription>Scan status across all managed computers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={auditSummaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Computers by Operating System</CardTitle>
                <CardDescription>Operating system distribution across the network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={osSummaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="os" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Tables Section */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Software Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Software</span>
                  <Badge variant="outline">{softwareSummary.totalSoftware}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Commercial Software</span>
                  <Badge className="bg-green-100 text-green-800">{softwareSummary.commercialSoftware}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Non-Commercial Software</span>
                  <Badge className="bg-blue-100 text-blue-800">{softwareSummary.nonCommercialSoftware}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Prohibited Software</span>
                  <Badge className="bg-red-100 text-red-800">{softwareSummary.prohibitedSoftware}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileCheck className="h-5 w-5 mr-2 text-green-600" />
                  License Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">In Compliance</span>
                  <Badge className="bg-green-100 text-green-800">{complianceSummary.licenseInCompliance}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Over Licensed</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{complianceSummary.overLicensed}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Under Licensed</span>
                  <Badge className="bg-orange-100 text-orange-800">{complianceSummary.underLicensed}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Expired License</span>
                  <Badge className="bg-red-100 text-red-800">{complianceSummary.expiredLicense}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-purple-600" />
                  Warranty Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">In Compliance</span>
                  <Badge className="bg-green-100 text-green-800">{warrantySummary.warrantyInCompliance}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Expired Warranty</span>
                  <Badge className="bg-red-100 text-red-800">{warrantySummary.expiredWarranty}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Unidentified</span>
                  <Badge className="bg-gray-100 text-gray-800">{warrantySummary.unidentified}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Devices</span>
                  <Badge variant="outline">{warrantySummary.warrantyInCompliance + warrantySummary.expiredWarranty + warrantySummary.unidentified}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-red-600" />
                  Security Threats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Threats Detected</span>
                  <Badge className="bg-red-100 text-red-800">{prohibitedSoftwareData.detected}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Threats Blocked</span>
                  <Badge className="bg-orange-100 text-orange-800">{prohibitedSoftwareData.blocked}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Devices Affected</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{prohibitedSummary?.devicesAffected || 4}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Threats</span>
                  <Badge className="bg-red-100 text-red-800">{prohibitedSummary?.activeThreats || 3}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Security Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                Recent Security Actions
              </CardTitle>
              <CardDescription>Latest prohibited software detections and actions taken</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prohibitedSoftwareData.recentActions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Shield className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{action.software}</div>
                        <div className="text-xs text-gray-500">Device: {action.device}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={
                          action.action === 'Blocked' ? 'bg-red-100 text-red-800' :
                          action.action === 'Uninstalled' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {action.action}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">{action.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
