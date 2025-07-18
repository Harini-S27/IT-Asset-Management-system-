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
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  Settings,
  Shield,
  ShieldOff,
  WifiOff,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { BlockWebsiteDialog } from './block-website-dialog';
import { UnblockWebsiteDialog } from './unblock-website-dialog';
import { DisconnectDeviceDialog } from './disconnect-device-dialog';

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

interface DeviceManagementDropdownProps {
  device: Device;
}

export function DeviceManagementDropdown({ device }: DeviceManagementDropdownProps) {
  const { toast } = useToast();
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  // Get device management status
  const { data: deviceStatus, isLoading: statusLoading } = useQuery<DeviceStatus>({
    queryKey: [`/api/device-management/${device.id}/status`],
    refetchInterval: 30000
  });

  // Disconnect device mutation
  const disconnectMutation = useMutation({
    mutationFn: async (data: { reason: string }) => {
      const response = await fetch('/api/device-management/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          deviceIp: device.ipAddress,
          macAddress: device.macAddress,
          reason: data.reason,
          performedBy: 'admin'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect device');
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
        throw new Error('Failed to reconnect device');
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

  const handleQuickDisconnect = () => {
    disconnectMutation.mutate({ reason: 'Quick disconnect by admin' });
  };

  const handleReconnect = () => {
    reconnectMutation.mutate();
  };

  const getStatusBadge = () => {
    if (statusLoading) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }

    if (!deviceStatus) {
      return null;
    }

    if (deviceStatus.isDisconnected) {
      return (
        <Badge variant="destructive" className="text-xs">
          <WifiOff className="h-3 w-3 mr-1" />
          Disconnected
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
        Open Access
      </Badge>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm font-medium">
              {device.name}
            </div>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              IP: {device.ipAddress}
            </div>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              className="cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              Block Website
            </DropdownMenuItem>

            {deviceStatus?.blockedDomains && deviceStatus.blockedDomains.length > 0 && (
              <DropdownMenuItem
                onClick={() => setShowUnblockDialog(true)}
                className="cursor-pointer"
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Unblock Website
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {deviceStatus?.isDisconnected ? (
              <DropdownMenuItem
                onClick={handleReconnect}
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
              <>
                <DropdownMenuItem
                  onClick={handleQuickDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="cursor-pointer text-red-600"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <WifiOff className="mr-2 h-4 w-4" />
                  )}
                  Quick Remove
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => setShowDisconnectDialog(true)}
                  className="cursor-pointer text-red-600"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Remove with Reason
                </DropdownMenuItem>
              </>
            )}

            {deviceStatus?.blockedDomains && deviceStatus.blockedDomains.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Blocked Sites:
                </div>
                {deviceStatus.blockedDomains.slice(0, 3).map((block, index) => (
                  <div key={index} className="px-2 py-1 text-xs text-muted-foreground">
                    • {block.domain}
                  </div>
                ))}
                {deviceStatus.blockedDomains.length > 3 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    ... and {deviceStatus.blockedDomains.length - 3} more
                  </div>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BlockWebsiteDialog
        device={device}
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
      />

      <UnblockWebsiteDialog
        device={device}
        blockedDomains={deviceStatus?.blockedDomains || []}
        open={showUnblockDialog}
        onOpenChange={setShowUnblockDialog}
      />

      <DisconnectDeviceDialog
        device={device}
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        onDisconnect={(reason) => disconnectMutation.mutate({ reason })}
        isLoading={disconnectMutation.isPending}
      />
    </>
  );
}