import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Monitor,
  Cpu
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

interface DeviceTableProps {
  onEditDevice: (device: Device) => void;
  onDeleteDevice: (id: number) => void;
  onViewDeviceDetails: (device: Device) => void;
}

const DeviceTable = ({ 
  onEditDevice, 
  onDeleteDevice, 
  onViewDeviceDetails 
}: DeviceTableProps) => {
  const { data: devices = [], isLoading, isError } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Define table columns
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
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-gray-100">
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDeviceDetails(device)}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditDevice(device)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteDevice(device.id)}
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
      data={devices}
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
