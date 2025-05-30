import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ShieldOff, Loader2 } from 'lucide-react';

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  macAddress?: string;
}

interface BlockedDomain {
  domain: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

interface UnblockWebsiteDialogProps {
  device: Device;
  blockedDomains: BlockedDomain[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnblockWebsiteDialog({ device, blockedDomains, open, onOpenChange }: UnblockWebsiteDialogProps) {
  const { toast } = useToast();
  const [selectedDomain, setSelectedDomain] = useState<string>('');

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
      setSelectedDomain('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Unblock Failed",
        description: error.message || "Failed to unblock website",
        variant: "destructive"
      });
    }
  });

  const handleUnblock = (domain: string) => {
    unblockMutation.mutate(domain);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Unblock Website for {device.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Device</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="font-medium">{device.name}</div>
              <div className="text-muted-foreground">IP: {device.ipAddress}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Currently Blocked Websites</Label>
            {blockedDomains.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground text-sm">
                No websites are currently blocked for this device
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {blockedDomains.map((block, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{block.domain}</div>
                      <div className="text-xs text-muted-foreground">
                        Blocked: {new Date(block.createdAt).toLocaleDateString()}
                      </div>
                      {block.reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reason: {block.reason}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnblock(block.domain)}
                      disabled={unblockMutation.isPending}
                    >
                      {unblockMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Unblock
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={unblockMutation.isPending}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}