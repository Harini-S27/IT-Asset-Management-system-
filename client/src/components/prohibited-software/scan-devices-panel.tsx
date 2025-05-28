import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Play, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Device } from "@shared/schema";

export function ScanDevicesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [isScanning, setIsScanning] = useState(false);

  // Fetch devices for scan selection
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Scan device mutation
  const scanMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await apiRequest(`/api/scan-device/${deviceId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to scan device');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/detection-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prohibited-software-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scan-results'] });
      
      toast({
        title: "Scan Completed",
        description: `Found ${data.detectedCount} prohibited software instances`,
      });
      setIsScanning(false);
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Unable to complete the software scan",
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });

  const handleScanDevice = async (deviceId: number) => {
    setIsScanning(true);
    
    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    scanMutation.mutate(deviceId);
  };

  const handleScanAll = async () => {
    setIsScanning(true);
    
    // Simulate scanning multiple devices
    const activeDevices = devices.filter(device => device.status === 'Active');
    
    for (let i = 0; i < Math.min(activeDevices.length, 3); i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      scanMutation.mutate(activeDevices[i].id);
    }
    
    toast({
      title: "Bulk Scan Completed",
      description: `Scanned ${Math.min(activeDevices.length, 3)} devices`,
    });
    setIsScanning(false);
  };

  const handleScan = () => {
    if (selectedDevice === "all") {
      handleScanAll();
    } else {
      const deviceId = parseInt(selectedDevice);
      handleScanDevice(deviceId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scan Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-600" />
            Device Scanner
          </CardTitle>
          <CardDescription>
            Scan devices for prohibited software
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Device</label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger>
                <SelectValue placeholder="Choose device to scan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active Devices</SelectItem>
                {devices
                  .filter(device => device.status === 'Active')
                  .map(device => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      {device.name} ({device.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleScan}
            disabled={isScanning || !selectedDevice}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isScanning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Scan
              </>
            )}
          </Button>

          {isScanning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center text-blue-700">
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                <span className="text-sm">Scanning in progress...</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                This may take a few moments
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              // Simulate blocking all executables
              toast({
                title: "Execution Blocked",
                description: "All prohibited executables are now blocked system-wide",
              });
            }}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Block All Executables
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              // Simulate auto-uninstall
              toast({
                title: "Auto-Uninstall Enabled",
                description: "Prohibited software will be automatically removed",
              });
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Enable Auto-Uninstall
          </Button>
        </CardContent>
      </Card>

      {/* Scan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Last Full Scan</span>
              <Badge variant="outline">2 hours ago</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Threats Detected</span>
              <Badge className="bg-red-100 text-red-800">3 active</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Devices Scanned</span>
              <Badge className="bg-green-100 text-green-800">12/15</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Protection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Protection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Real-time Protection</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Execution Blocking</span>
              <Badge className="bg-green-100 text-green-800">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-Uninstall</span>
              <Badge className="bg-yellow-100 text-yellow-800">Selective</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}