import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Wifi, 
  Clock, 
  Network,
  Activity,
  Eye,
  History
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { formatTimeSince, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NetworkDevice {
  id: number;
  macAddress: string;
  deviceName: string | null;
  currentIp: string | null;
  vendor: string | null;
  deviceType: string | null;
  behaviorTag: string | null;
  firstSeen: string;
  lastSeen: string;
  status: string;
}

interface IpHistory {
  id: number;
  ipAddress: string;
  assignedAt: string;
  releasedAt: string | null;
  leaseType: string;
}

const NetworkDiscoveryTable = () => {
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: networkDevices = [], isLoading, refetch } = useQuery<NetworkDevice[]>({
    queryKey: ['/api/network-devices'],
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });

  const { data: ipHistory = [] } = useQuery<IpHistory[]>({
    queryKey: ['/api/network-devices', selectedDevice?.id, 'history'],
    enabled: !!selectedDevice?.id,
  });

  const getBehaviorColor = (tag: string | null): string => {
    if (!tag) return "bg-gray-100 text-gray-800";
    
    switch (tag.toLowerCase()) {
      case "linux admin device": return "bg-blue-100 text-blue-800";
      case "iot mqtt device": return "bg-green-100 text-green-800";
      case "iot sensor": return "bg-green-100 text-green-800";
      case "windows remote access": return "bg-purple-100 text-purple-800";
      case "network printer": return "bg-orange-100 text-orange-800";
      case "security camera": return "bg-red-100 text-red-800";
      case "web client": return "bg-cyan-100 text-cyan-800";
      case "server device": return "bg-indigo-100 text-indigo-800";
      case "high activity device": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "offline": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const columns = [
    {
      header: "Device Info",
      accessorKey: "deviceName",
      cell: (device: NetworkDevice) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-md bg-blue-100 mr-3 flex items-center justify-center">
            <Network className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {device.deviceName || "Unknown Device"}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {device.macAddress}
            </div>
          </div>
        </div>
      ),
      enableSorting: true,
    },
    {
      header: "Current IP",
      accessorKey: "currentIp",
      cell: (device: NetworkDevice) => (
        <div>
          <div className="text-sm font-mono">
            {device.currentIp || "Not assigned"}
          </div>
          <div className="text-xs text-gray-500">
            {device.vendor || "Unknown vendor"}
          </div>
        </div>
      ),
    },
    {
      header: "Behavior",
      accessorKey: "behaviorTag",
      cell: (device: NetworkDevice) => (
        <Badge className={cn("text-xs", getBehaviorColor(device.behaviorTag))}>
          {device.behaviorTag || "Analyzing..."}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (device: NetworkDevice) => (
        <Badge className={cn("text-xs", getStatusColor(device.status))}>
          {device.status}
        </Badge>
      ),
    },
    {
      header: "Last Seen",
      accessorKey: "lastSeen",
      cell: (device: NetworkDevice) => (
        <div className="text-sm text-gray-600">
          {formatTimeSince(device.lastSeen)}
        </div>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (device: NetworkDevice) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDevice(device);
              setShowHistory(true);
            }}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Wifi className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Scanning network...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Network Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discovered Devices</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{networkDevices.length}</div>
              <p className="text-xs text-muted-foreground">Active on network</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DHCP Leases</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {networkDevices.filter(d => d.currentIp).length}
              </div>
              <p className="text-xs text-muted-foreground">Active IP assignments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IoT Devices</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {networkDevices.filter(d => 
                  d.behaviorTag?.toLowerCase().includes('iot') || 
                  d.behaviorTag?.toLowerCase().includes('sensor')
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">IoT devices detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Devices</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {networkDevices.filter(d => 
                  d.behaviorTag?.toLowerCase().includes('admin') ||
                  d.behaviorTag?.toLowerCase().includes('server')
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">Administrative access</p>
            </CardContent>
          </Card>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live network discovery active</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Wifi className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Network devices table */}
        <div className="border rounded-lg">
          <DataTable 
            data={networkDevices} 
            columns={columns}
          />
        </div>
      </div>

      {/* IP History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              IP History: {selectedDevice?.deviceName || "Unknown Device"}
            </DialogTitle>
            <DialogDescription>
              MAC Address: {selectedDevice?.macAddress}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Current IP</label>
                <p className="text-lg font-mono">{selectedDevice?.currentIp || "Not assigned"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Behavior</label>
                <Badge className={cn("text-xs", getBehaviorColor(selectedDevice?.behaviorTag))}>
                  {selectedDevice?.behaviorTag || "Analyzing..."}
                </Badge>
              </div>
            </div>

            {/* IP History */}
            <div>
              <h4 className="text-sm font-medium mb-2">IP Assignment History</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {ipHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-mono text-sm">{entry.ipAddress}</span>
                      <span className="text-xs text-gray-500 ml-2">({entry.leaseType})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeSince(entry.assignedAt)}
                      {entry.releasedAt && ` - ${formatTimeSince(entry.releasedAt)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Details */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium">First Seen</label>
                <p className="text-sm">{selectedDevice?.firstSeen ? formatTimeSince(selectedDevice.firstSeen) : "Unknown"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Last Seen</label>
                <p className="text-sm">{selectedDevice?.lastSeen ? formatTimeSince(selectedDevice.lastSeen) : "Unknown"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NetworkDiscoveryTable;