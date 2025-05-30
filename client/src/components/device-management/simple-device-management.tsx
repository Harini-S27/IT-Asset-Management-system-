import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  Settings,
  Shield,
  ShieldOff,
  WifiOff,
  Wifi,
  Loader2,
  CheckCircle
} from 'lucide-react';

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  macAddress?: string;
  status: string;
}

interface DeviceStatus {
  deviceId: number;
  isDisconnected: boolean;
  blockedDomains: Array<{
    domain: string;
    reason: string;
    createdAt: string;
    createdBy: string;
  }>;
  totalBlocks: number;
}

interface SimpleDeviceManagementProps {
  device: Device;
}

export function SimpleDeviceManagement({ device }: SimpleDeviceManagementProps) {
  const { toast } = useToast();
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [domain, setDomain] = useState('');

  // Get device management status
  const { data: deviceStatus, isLoading: statusLoading } = useQuery<DeviceStatus>({
    queryKey: [`/api/device-management/${device.id}/status`],
    refetchInterval: 30000,
    retry: false
  });

  // Block website mutation
  const blockMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await fetch('/api/device-management/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          deviceIp: device.ipAddress,
          macAddress: device.macAddress,
          domain: domain,
          reason: 'Blocked via network discovery',
          performedBy: 'admin'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to block website');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Website Blocked",
        description: `Successfully blocked ${domain} for ${device.name}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/device-management/${device.id}/status`] });
      setDomain('');
      setShowBlockInput(false);
    },
    onError: (error: any) => {
      toast({
        title: "Block Failed",
        description: error.message || "Failed to block website",
        variant: "destructive"
      });
    }
  });

  // Unblock website mutation
  const unblockMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await fetch('/api/device-management/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          deviceIp: device.ipAddress,
          domain: domain,
          performedBy: 'admin'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unblock website');
      }

      return response.json();
    },
    onSuccess: (data, domain) => {
      toast({
        title: "Website Unblocked",
        description: `Successfully unblocked ${domain} for ${device.name}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/device-management/${device.id}/status`] });
    },
    onError: (error: any) => {
      toast({
        title: "Unblock Failed",
        description: error.message || "Failed to unblock website",
        variant: "destructive"
      });
    }
  });

  // Disconnect device mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/device-management/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          deviceIp: device.ipAddress,
          macAddress: device.macAddress,
          reason: 'Quick disconnect via network discovery',
          performedBy: 'admin'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disconnect device');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Disconnected",
        description: `${device.name} has been disconnected from the network`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/device-management/${device.id}/status`] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect device",
        variant: "destructive"
      });
    }
  });

  // Reconnect device mutation
  const reconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/device-management/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          deviceIp: device.ipAddress,
          performedBy: 'admin'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reconnect device');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Reconnected",
        description: `${device.name} has been reconnected to the network`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/device-management/${device.id}/status`] });
    },
    onError: (error: any) => {
      toast({
        title: "Reconnect Failed",
        description: error.message || "Failed to reconnect device",
        variant: "destructive"
      });
    }
  });

  const handleBlockWebsite = () => {
    if (!domain.trim()) {
      toast({
        title: "Domain Required",
        description: "Please enter a domain to block",
        variant: "destructive"
      });
      return;
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    blockMutation.mutate(cleanDomain);
  };

  const getStatusBadge = () => {
    if (statusLoading) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }

    if (!deviceStatus) {
      return (
        <Badge variant="outline" className="text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Manage
        </Badge>
      );
    }

    if (deviceStatus.isDisconnected) {
      return (
        <Badge variant="destructive" className="text-xs">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      );
    }

    if (deviceStatus.blockedDomains.length > 0) {
      return (
        <Badge variant="secondary" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {deviceStatus.blockedDomains.length} blocked
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs text-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        Open
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5 text-sm font-medium">
            {device.name}
          </div>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            IP: {device.ipAddress}
          </div>
          <DropdownMenuSeparator />
          
          {/* Block Website Section */}
          {showBlockInput ? (
            <div className="px-2 py-2 space-y-2">
              <Input
                placeholder="facebook.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="text-xs"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={handleBlockWebsite}
                  disabled={blockMutation.isPending}
                  className="flex-1 text-xs"
                >
                  {blockMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Block"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowBlockInput(false);
                    setDomain('');
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <DropdownMenuItem
              onClick={() => setShowBlockInput(true)}
              className="cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              Block Website
            </DropdownMenuItem>
          )}

          {/* Unblock websites */}
          {deviceStatus?.blockedDomains && deviceStatus.blockedDomains.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Blocked Sites:
              </div>
              {deviceStatus.blockedDomains.slice(0, 3).map((block, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => unblockMutation.mutate(block.domain)}
                  disabled={unblockMutation.isPending}
                  className="cursor-pointer text-xs"
                >
                  <ShieldOff className="mr-2 h-3 w-3" />
                  Unblock {block.domain}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />

          {/* Disconnect/Reconnect */}
          {deviceStatus?.isDisconnected ? (
            <DropdownMenuItem
              onClick={() => reconnectMutation.mutate()}
              disabled={reconnectMutation.isPending}
              className="cursor-pointer text-green-600"
            >
              {reconnectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="mr-2 h-4 w-4" />
              )}
              Reconnect Device
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="cursor-pointer text-red-600"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <WifiOff className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}