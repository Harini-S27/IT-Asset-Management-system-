import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Monitor,
  Cpu,
  Shield
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { formatTimeSince, getStatusColor, cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Device } from "@shared/schema";
import EditDeviceDialog from "./edit-device-dialog";
import BlockWebsiteDialog from "@/components/website-blocking/block-website-dialog";

interface DeviceTableProps {
  onEditDevice: (device: Device) => void;
  onDeleteDevice: (id: number) => void;
  onViewDeviceDetails: (device: Device) => void;
  categoryFilter?: string;
}

const DeviceTable = ({ 
  onEditDevice, 
  onDeleteDevice, 
  onViewDeviceDetails,
  categoryFilter = "All"
}: DeviceTableProps) => {
  const { data: devices = [], isLoading, isError } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [deviceToBlock, setDeviceToBlock] = useState<Device | null>(null);

  // Define table columns
  // Filter devices based on selected category
  const filteredDevices = devices.filter(device => {
    if (categoryFilter === "All") return true;
    if (categoryFilter === "Workstations") return device.type === "Workstation";
    if (categoryFilter === "Servers") return device.type === "Server";
    if (categoryFilter === "Network Devices") return ["Router", "Switch", "Firewall", "Access Point"].includes(device.type);
    if (categoryFilter === "Mobile Devices") return ["Laptop", "Tablet", "Mobile Phone"].includes(device.type);
    if (categoryFilter === "Agent-Reported") return device.location === "Agent-Reported" || device.location === "Remote Office";
    return true;
  });

  const columns = [
    {
      header: "Device",
      accessorKey: "name",
      cell: (device: Device) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-md bg-gray-100 mr-3 flex items-center justify-center">
            {getDeviceIcon(device.type)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{device.name}</div>
            <div className="text-sm text-gray-500">{device.model}</div>
          </div>
        </div>
      ),
      enableSorting: true,
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: (device: Device) => (
        <span className="text-sm">{device.type}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (device: Device) => (
        <Badge className={cn(getStatusColorClass(device.status))}>
          {device.status}
        </Badge>
      ),
    },
    {
      header: "Location",
      accessorKey: "location",
      cell: (device: Device) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-gray-500 mr-1" />
          <span className="text-sm">{device.location}</span>
        </div>
      ),
    },
    {
      header: "IP Address",
      accessorKey: "ipAddress",
      cell: (device: Device) => (
        <span className="text-sm">{device.ipAddress || "N/A"}</span>
      ),
    },
    {
      header: "Last Update",
      accessorKey: "lastUpdated",
      cell: (device: Device) => (
        <span className="text-sm text-gray-500">
          {device.lastUpdated ? formatTimeSince(device.lastUpdated) : 'N/A'}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (device: Device) => (
        <div className="flex items-center justify-center space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click from triggering
              onEditDevice(device);
            }}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 text-xs font-medium transition-colors"
          >
            Edit
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click from triggering
              
              // Handle deactivation by changing status to "Inactive" if currently Active
              if (device.status === "Active") {
                // Clone the device and update its status
                const updatedDevice = {...device, status: "Inactive"};
                onEditDevice(updatedDevice);
              } else if (device.status === "Inactive") {
                // Reactivate if currently inactive
                const updatedDevice = {...device, status: "Active"};
                onEditDevice(updatedDevice);
              }
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              device.status === "Active" 
                ? "bg-red-100 hover:bg-red-200 text-red-700" 
                : "bg-green-100 hover:bg-green-200 text-green-700"
            }`}
          >
            {device.status === "Active" ? "Deactivate" : "Activate"}
          </button>
          
          {/* Keep the dropdown for additional actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1 rounded-full hover:bg-gray-100 dropdown-trigger"
                onClick={(e) => e.stopPropagation()} // Prevent row click
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDeviceDetails(device);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                <span>Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDevice(device.id);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div>Loading devices...</div>;
  }

  if (isError) {
    return <div>Error loading devices</div>;
  }

  return (
    <DataTable
      data={filteredDevices}
      columns={columns}
      onRowClick={(device) => onViewDeviceDetails(device)}
    />
  );
};

// Helper function to get status badge color
const getStatusColorClass = (status: string): string => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Inactive":
      return "bg-red-100 text-red-800";
    case "Maintenance":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Helper function to get device type icon
const getDeviceIcon = (type: string) => {
  switch (type) {
    case "Workstation":
      return <Monitor className="h-6 w-6 text-gray-500" />;
    case "Server":
      return <Cpu className="h-6 w-6 text-gray-500" />;
    case "Network":
      return <Cpu className="h-6 w-6 text-gray-500" />;
    case "Router":
      return <Cpu className="h-6 w-6 text-gray-500" />;
    case "Laptop":
      return <Monitor className="h-6 w-6 text-gray-500" />;
    case "Mobile":
      return <Monitor className="h-6 w-6 text-gray-500" />;
    default:
      return <Monitor className="h-6 w-6 text-gray-500" />;
  }
};

export default DeviceTable;
