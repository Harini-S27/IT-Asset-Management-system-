import React, { useState } from "react";
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  TableProperties,
  FileDown, 
  FileText, 
  Calendar, 
  Download,
  Filter, 
  Search,
  FileSpreadsheet, 
  Clock,
  RefreshCw
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";

// Mock report templates
const reportTemplates = [
  { id: 1, name: "Monthly Device Health", description: "Overview of all devices and their health status" },
  { id: 2, name: "Top Offline Devices", description: "Devices that have been offline for the longest time" },
  { id: 3, name: "Hardware Inventory", description: "Complete inventory of all hardware assets" },
  { id: 4, name: "Department Asset Distribution", description: "How assets are distributed across departments" },
  { id: 5, name: "Maintenance Schedule", description: "Upcoming maintenance for all devices" },
];

// Mock device data
const deviceData = [
  { 
    id: 1, 
    name: "WS-001-DEV", 
    type: "Workstation", 
    status: "Active", 
    assigned_to: "John Smith", 
    department: "Engineering", 
    location: "HQ - Floor 1", 
    last_active: "Today at 10:23 AM"
  },
  { 
    id: 2, 
    name: "LP-045-DEV", 
    type: "Laptop", 
    status: "Active", 
    assigned_to: "Sarah Johnson", 
    department: "Marketing", 
    location: "HQ - Floor 2", 
    last_active: "Today at 9:45 AM"
  },
  { 
    id: 3, 
    name: "SV-002-PRD", 
    type: "Server", 
    status: "Active", 
    assigned_to: "System Admin", 
    department: "IT", 
    location: "Data Center", 
    last_active: "Today at 11:10 AM"
  },
  { 
    id: 4, 
    name: "RT-010-NET", 
    type: "Router", 
    status: "Offline", 
    assigned_to: "Network Team", 
    department: "IT", 
    location: "Branch Office", 
    last_active: "Yesterday at 4:30 PM"
  },
  { 
    id: 5, 
    name: "SW-005-NET", 
    type: "Switch", 
    status: "Maintenance", 
    assigned_to: "Network Team", 
    department: "IT", 
    location: "Data Center", 
    last_active: "Yesterday at 2:15 PM"
  },
  { 
    id: 6, 
    name: "LP-102-DEV", 
    type: "Laptop", 
    status: "Inactive", 
    assigned_to: "Unassigned", 
    department: "Inventory", 
    location: "Storage Room", 
    last_active: "2 weeks ago"
  },
  { 
    id: 7, 
    name: "TB-023-DEV", 
    type: "Tablet", 
    status: "Active", 
    assigned_to: "Alex Chen", 
    department: "Sales", 
    location: "Remote", 
    last_active: "Today at 8:30 AM"
  },
  { 
    id: 8, 
    name: "PR-007-DEV", 
    type: "Printer", 
    status: "Active", 
    assigned_to: "Office Manager", 
    department: "Operations", 
    location: "HQ - Floor 1", 
    last_active: "Today at 11:45 AM"
  },
];

// Status count for pie chart
const statusData = [
  { name: "Active", value: 5, color: "#48BB78" },
  { name: "Offline", value: 1, color: "#F56565" },
  { name: "Maintenance", value: 1, color: "#ECC94B" },
  { name: "Inactive", value: 1, color: "#A0AEC0" },
];

// Type distribution for bar chart
const typeData = [
  { name: "Workstation", count: 1 },
  { name: "Laptop", count: 2 },
  { name: "Server", count: 1 },
  { name: "Router", count: 1 },
  { name: "Switch", count: 1 },
  { name: "Tablet", count: 1 },
  { name: "Printer", count: 1 },
];

const ReportsPage = () => {
  const { toast } = useToast();
  const [reportView, setReportView] = useState<"table" | "bar" | "pie">("table");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [filters, setFilters] = useState({
    deviceType: "all",
    status: "all",
    location: "all",
    department: "all",
    includeHistory: false,
    includeInactive: false,
  });
  const [showReportTemplates, setShowReportTemplates] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: "weekly",
    dayOfWeek: "monday",
    timeOfDay: "09:00",
    recipients: "",
    format: "pdf",
    enabled: false
  });

  // Report columns
  const columns = [
    { header: "ID", accessorKey: "id" },
    { header: "Name", accessorKey: "name" },
    { header: "Type", accessorKey: "type" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (item: any) => (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.status === "Active" ? "bg-green-100 text-green-800" :
          item.status === "Offline" ? "bg-red-100 text-red-800" :
          item.status === "Maintenance" ? "bg-yellow-100 text-yellow-800" :
          "bg-gray-100 text-gray-800"
        }`}>
          {item.status}
        </div>
      ),
    },
    { header: "Assigned To", accessorKey: "assigned_to" },
    { header: "Department", accessorKey: "department" },
    { header: "Location", accessorKey: "location" },
    { header: "Last Active", accessorKey: "last_active" },
  ];

  // Function to handle generating reports
  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    
    // Simulate API call or data processing
    setTimeout(() => {
      setIsGeneratingReport(false);
      setReportGenerated(true);
      toast({
        title: "Report Generated",
        description: "Your report has been successfully generated.",
      });
    }, 1500);
  };

  // Function to handle schedule configuration
  const handleScheduleChange = (field: string, value: any) => {
    setScheduleConfig(prev => ({ ...prev, [field]: value }));
  };
  
  // Function to save schedule
  const handleSaveSchedule = () => {
    // Here you would normally save the schedule to the server
    setScheduleConfig(prev => ({ ...prev, enabled: true }));
    setShowScheduleDialog(false);
    
    toast({
      title: "Schedule Saved",
      description: "Your report schedule has been configured successfully.",
    });
  };
  
  // Function to handle report download/export
  const handleExport = (format: "pdf" | "excel" | "csv" | "json") => {
    try {
      if (format === 'csv') {
        exportToCSV(deviceData);
      } else if (format === 'excel') {
        exportToExcel(deviceData);
      } else if (format === 'pdf') {
        exportToPDF(deviceData);
      } else if (format === 'json') {
        exportToJSON(deviceData);
      }
      
      toast({
        title: "Export successful",
        description: `Report has been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the report.",
        variant: "destructive",
      });
    }
  };
  
  // CSV Export
  const exportToCSV = (dataToExport: any[]) => {
    // Define the headers based on columns
    const headers = columns.map(col => col.header);
    
    // Map the data to CSV rows
    const rows = dataToExport.map(item => (
      columns.map(col => {
        const key = col.accessorKey as string;
        return item[key] !== undefined ? item[key].toString() : '';
      })
    ));
    
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
    link.setAttribute('download', `asset-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Excel Export
  const exportToExcel = (dataToExport: any[]) => {
    // For now, we'll use the CSV approach but change the extension
    // In a real-world scenario, you would use a library like xlsx for proper Excel files
    const headers = columns.map(col => col.header);
    
    const rows = dataToExport.map(item => (
      columns.map(col => {
        const key = col.accessorKey as string;
        return item[key] !== undefined ? item[key].toString() : '';
      })
    ));
    
    const csvData = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `asset-report-${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // PDF Export
  const exportToPDF = (dataToExport: any[]) => {
    // Create a printable HTML version of the data
    let printContent = `
      <html>
        <head>
          <title>Asset Report</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; }
            .date { margin-top: 8px; color: #666; }
            .status-Active { background-color: #C6F6D5; color: #276749; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
            .status-Offline { background-color: #FED7D7; color: #9B2C2C; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
            .status-Maintenance { background-color: #FEFCBF; color: #975A16; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
            .status-Inactive { background-color: #E2E8F0; color: #4A5568; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Asset Report</h1>
            <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
          </div>
          <p>Date Range: ${format(dateRange.from, "PP")} to ${format(dateRange.to, "PP")}</p>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
    `;
    
    dataToExport.forEach(item => {
      printContent += `<tr>`;
      columns.forEach(col => {
        const key = col.accessorKey as string;
        if (key === 'status') {
          printContent += `<td><span class="status-${item[key]}">${item[key]}</span></td>`;
        } else {
          printContent += `<td>${item[key] !== undefined ? item[key] : 'N/A'}</td>`;
        }
      });
      printContent += `</tr>`;
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
      };
    } else {
      alert('Please allow pop-ups to export as PDF');
    }
  };
  
  // JSON Export
  const exportToJSON = (dataToExport: any[]) => {
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `asset-report-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter change handler
  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Handler for report template selection
  const handleSelectTemplate = (templateId: number) => {
    const template = reportTemplates.find(t => t.id === templateId);
    
    toast({
      title: "Template Applied",
      description: `Applied template: ${template?.name}`,
    });
    
    setShowReportTemplates(false);
    
    // Here you would typically apply the template settings
    // In this demo, we'll just generate the report
    handleGenerateReport();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Reports</h1>
          <p className="text-gray-500">Generate and export reports on your IT assets</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showReportTemplates} onOpenChange={setShowReportTemplates}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Report Templates</span>
                <span className="md:hidden">Templates</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Report Templates</DialogTitle>
                <DialogDescription>
                  Select a pre-configured report template to quickly generate common reports.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {reportTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className="flex justify-between items-center p-3 hover:bg-gray-100 rounded-md cursor-pointer transition-colors"
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReportTemplates(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline"
            className="flex items-center"
            onClick={() => {
              // Clear all filters functionality
              setFilters({
                deviceType: "all",
                status: "all",
                location: "all",
                department: "all",
                includeHistory: false,
                includeInactive: false,
              });
              setSearchQuery("");
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Reset Filters</span>
            <span className="md:hidden">Reset</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Report Filters & Generator Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Generate Reports
            </CardTitle>
            <CardDescription>
              Configure filters and options to generate custom reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="device-type">Device Type</Label>
                  <Select 
                    value={filters.deviceType} 
                    onValueChange={(value) => handleFilterChange("deviceType", value)}
                  >
                    <SelectTrigger id="device-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Workstation">Workstation</SelectItem>
                      <SelectItem value="Laptop">Laptop</SelectItem>
                      <SelectItem value="Server">Server</SelectItem>
                      <SelectItem value="Router">Router</SelectItem>
                      <SelectItem value="Switch">Switch</SelectItem>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Printer">Printer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => handleFilterChange("status", value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Offline">Offline</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select 
                    value={filters.location} 
                    onValueChange={(value) => handleFilterChange("location", value)}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="HQ - Floor 1">HQ - Floor 1</SelectItem>
                      <SelectItem value="HQ - Floor 2">HQ - Floor 2</SelectItem>
                      <SelectItem value="Data Center">Data Center</SelectItem>
                      <SelectItem value="Branch Office">Branch Office</SelectItem>
                      <SelectItem value="Storage Room">Storage Room</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={filters.department} 
                    onValueChange={(value) => handleFilterChange("department", value)}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Inventory">Inventory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <Label>Date Range</Label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-from"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            format(dateRange.from, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange({ ...dateRange, from: date as Date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="self-center">to</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-to"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange.to ? (
                            format(dateRange.to, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange({ ...dateRange, to: date as Date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="flex flex-col justify-end">
                  <Button 
                    onClick={handleGenerateReport}
                    className="bg-[#4299E1] hover:bg-[#4299E1]/90 h-10"
                    disabled={isGeneratingReport}
                  >
                    {isGeneratingReport ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChartIcon className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Optional toggles */}
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="include-history"
                      checked={filters.includeHistory}
                      onCheckedChange={(checked) => handleFilterChange("includeHistory", checked)}
                    />
                    <Label htmlFor="include-history" className="cursor-pointer">Include Device History</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="include-inactive"
                      checked={filters.includeInactive}
                      onCheckedChange={(checked) => handleFilterChange("includeInactive", checked)}
                    />
                    <Label htmlFor="include-inactive" className="cursor-pointer">Include Inactive Devices</Label>
                  </div>
                </div>
                
                {/* Search field */}
                <div className="w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search devices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              
              {/* Schedule report option */}
              <div className="p-4 bg-gray-50 rounded-md border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm">Schedule Report</span>
                    {scheduleConfig.enabled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Enabled
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowScheduleDialog(true)}
                  >
                    Configure Schedule
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Set up automated report generation and distribution on a recurring schedule</p>
              </div>
              
              {/* Schedule Configuration Dialog */}
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Configure Report Schedule</DialogTitle>
                    <DialogDescription>
                      Set up automatic generation and delivery of this report on a schedule.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select 
                        value={scheduleConfig.frequency} 
                        onValueChange={(value) => handleScheduleChange("frequency", value)}
                      >
                        <SelectTrigger id="frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {scheduleConfig.frequency === "weekly" && (
                      <div className="grid gap-2">
                        <Label htmlFor="dayOfWeek">Day of Week</Label>
                        <Select 
                          value={scheduleConfig.dayOfWeek} 
                          onValueChange={(value) => handleScheduleChange("dayOfWeek", value)}
                        >
                          <SelectTrigger id="dayOfWeek">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="grid gap-2">
                      <Label htmlFor="timeOfDay">Time of Day</Label>
                      <Input 
                        id="timeOfDay"
                        type="time"
                        value={scheduleConfig.timeOfDay}
                        onChange={(e) => handleScheduleChange("timeOfDay", e.target.value)}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="recipients">Email Recipients</Label>
                      <Input 
                        id="recipients"
                        placeholder="Enter email addresses (comma separated)"
                        value={scheduleConfig.recipients}
                        onChange={(e) => handleScheduleChange("recipients", e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        Enter the email addresses that should receive this report
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="format">Report Format</Label>
                      <Select 
                        value={scheduleConfig.format} 
                        onValueChange={(value) => handleScheduleChange("format", value)}
                      >
                        <SelectTrigger id="format">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSchedule}>
                      Save Schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Generated Report Display Panel */}
        {reportGenerated && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Generated Report</CardTitle>
                <CardDescription>
                  Showing {deviceData.length} devices matching your criteria
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Tabs 
                  value={reportView} 
                  onValueChange={(v) => setReportView(v as "table" | "bar" | "pie")}
                  className="hidden sm:block"
                >
                  <TabsList>
                    <TabsTrigger value="table" className="flex items-center">
                      <TableProperties className="h-4 w-4 mr-2" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="flex items-center">
                      <BarChartIcon className="h-4 w-4 mr-2" />
                      Bar Chart
                    </TabsTrigger>
                    <TabsTrigger value="pie" className="flex items-center">
                      <PieChartIcon className="h-4 w-4 mr-2" />
                      Pie Chart
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="sm:hidden">
                  <Select
                    value={reportView}
                    onValueChange={(value) => setReportView(value as "table" | "bar" | "pie")}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Report view content */}
              <div className={reportView === "table" ? "block" : "hidden"}>
                <DataTable 
                  data={deviceData} 
                  columns={columns} 
                  searchable={false}
                  pagination={true}
                />
              </div>
              
              <div className={reportView === "bar" ? "block" : "hidden"}>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={typeData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 60,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ value: 'Number of Devices', angle: -90, position: 'insideLeft' }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Devices" fill="#4299E1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-sm text-gray-500 mt-4">
                  Device Distribution by Type
                </div>
              </div>
              
              <div className={reportView === "pie" ? "block" : "hidden"}>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={130}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-sm text-gray-500 mt-4">
                  Device Status Distribution
                </div>
              </div>
              
              {/* Export options */}
              <div className="mt-8 flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={() => handleExport("pdf")}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as PDF
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={() => handleExport("excel")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </Button>
                <Button 
                  className="flex items-center bg-[#48BB78] hover:bg-[#48BB78]/90"
                  onClick={() => handleExport("csv")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;