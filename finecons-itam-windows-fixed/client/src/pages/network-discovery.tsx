import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wifi, 
  Search, 
  Play, 
  Square, 
  Shield, 
  Key, 
  Monitor, 
  Smartphone, 
  Printer,
  Server,
  Router,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Copy,
  Eye
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NetworkScannerStatus {
  isScanning: boolean;
  totalDevices: number;
  activeApiKeys: number;
  lastScanTime: string;
}

interface DiscoveredDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  ports: number[];
  osGuess: string;
  responseTime: number;
  lastSeen: string;
}

interface DeviceApiKey {
  deviceId: number;
  apiKey: string;
  deviceName: string;
  ipAddress: string;
  macAddress: string;
  createdAt: string;
  status: 'active' | 'inactive';
  lastUsed?: string;
}

const getDeviceIcon = (vendor: string, hostname: string) => {
  const v = vendor.toLowerCase();
  const h = hostname.toLowerCase();
  
  if (v.includes('apple') || h.includes('iphone') || h.includes('ipad')) {
    return <Smartphone className="h-4 w-4" />;
  } else if (v.includes('cisco') || v.includes('netgear') || v.includes('linksys')) {
    return <Router className="h-4 w-4" />;
  } else if (h.includes('printer') || v.includes('hp') || v.includes('canon')) {
    return <Printer className="h-4 w-4" />;
  } else if (h.includes('server') || h.includes('nas')) {
    return <Server className="h-4 w-4" />;
  } else {
    return <Monitor className="h-4 w-4" />;
  }
};

const NetworkDiscoveryPage = () => {
  const [scanInterval, setScanInterval] = useState(5);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch network scanner status
  const { data: status, isLoading: statusLoading } = useQuery<NetworkScannerStatus>({
    queryKey: ['/api/network-scanner/status'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch discovered devices
  const { data: devices, isLoading: devicesLoading } = useQuery<DiscoveredDevice[]>({
    queryKey: ['/api/network-scanner/discovered-devices'],
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Fetch device API keys
  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery<DeviceApiKey[]>({
    queryKey: ['/api/network-scanner/api-keys'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Start scanner mutation
  const startScanner = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/network-scanner/start`, {
        method: 'POST',
        body: { intervalMinutes: scanInterval }
      });
    },
    onSuccess: () => {
      toast({
        title: "Network Scanner Started",
        description: `Scanning every ${scanInterval} minutes`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/network-scanner/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start network scanner",
        variant: "destructive"
      });
    }
  });

  // Stop scanner mutation
  const stopScanner = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/network-scanner/stop`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "Network Scanner Stopped",
        description: "Network scanning has been stopped"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/network-scanner/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop network scanner",
        variant: "destructive"
      });
    }
  });

  // Verify API key mutation
  const verifyApiKey = useMutation({
    mutationFn: async (apiKey: string) => {
      return apiRequest(`/api/network-scanner/verify-key`, {
        method: 'POST',
        body: { apiKey }
      });
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "Valid API Key",
          description: `API key belongs to ${data.device.deviceName}`
        });
      } else {
        toast({
          title: "Invalid API Key",
          description: "The API key is not valid",
          variant: "destructive"
        });
      }
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard"
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Network Discovery</h1>
          <p className="text-muted-foreground mt-1">
            Automatically detect and register devices on Finecons WiFi network
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Wifi className="h-4 w-4 mr-1" />
          Finecons Network Monitor
        </Badge>
      </div>

      {/* Scanner Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scanner Status</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusLoading ? '...' : status?.isScanning ? 'ACTIVE' : 'STOPPED'}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.isScanning ? 'Scanning network' : 'Scanner offline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discovered Devices</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusLoading ? '...' : status?.totalDevices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total devices found
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys Generated</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusLoading ? '...' : status?.activeApiKeys || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active device keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Scan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {statusLoading ? '...' : status?.lastScanTime ? formatTime(status.lastScanTime) : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              Latest scan time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Network Scanner Controls
          </CardTitle>
          <CardDescription>
            Control the automated network discovery system for Finecons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="scan-interval">Scan Interval (minutes):</Label>
              <Input
                id="scan-interval"
                type="number"
                value={scanInterval}
                onChange={(e) => setScanInterval(parseInt(e.target.value) || 5)}
                min="1"
                max="60"
                className="w-20"
              />
            </div>
            <Button
              onClick={() => startScanner.mutate()}
              disabled={status?.isScanning || startScanner.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Scanner
            </Button>
            <Button
              onClick={() => stopScanner.mutate()}
              disabled={!status?.isScanning || stopScanner.isPending}
              variant="outline"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Scanner
            </Button>
          </div>

          {status?.isScanning && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Network scanner is active and monitoring Finecons WiFi network every {scanInterval} minutes.
                New devices will be automatically registered with API keys.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="devices">Discovered Devices</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="verify">Verify Key</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Discovered Network Devices</CardTitle>
              <CardDescription>
                All devices detected on the Finecons network with auto-generated API keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="text-center py-8">Loading devices...</div>
              ) : devices && devices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>MAC Address</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.mac}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getDeviceIcon(device.vendor, device.hostname)}
                            <span className="font-medium">{device.hostname}</span>
                          </div>
                        </TableCell>
                        <TableCell>{device.ip}</TableCell>
                        <TableCell className="font-mono text-sm">{device.mac}</TableCell>
                        <TableCell>{device.vendor}</TableCell>
                        <TableCell>{formatTime(device.lastSeen)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No devices discovered yet. Start the scanner to begin detection.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device API Keys</CardTitle>
              <CardDescription>
                Auto-generated API keys for discovered devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeysLoading ? (
                <div className="text-center py-8">Loading API keys...</div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey) => (
                      <TableRow key={apiKey.apiKey}>
                        <TableCell className="font-medium">{apiKey.deviceName}</TableCell>
                        <TableCell>{apiKey.ipAddress}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {apiKey.apiKey.substring(0, 20)}...
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(apiKey.status)}>
                            {apiKey.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(apiKey.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey.apiKey)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No API keys generated yet. Start the scanner to auto-register devices.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verify API Key</CardTitle>
              <CardDescription>
                Test if an API key is valid and view associated device information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="api-key">API Key:</Label>
                <Input
                  id="api-key"
                  placeholder="Enter API key to verify..."
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => verifyApiKey.mutate(selectedApiKey)}
                  disabled={!selectedApiKey || verifyApiKey.isPending}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkDiscoveryPage;