import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WifiOff, Loader2, AlertTriangle } from 'lucide-react';

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  macAddress?: string;
}

interface DisconnectDeviceDialogProps {
  device: Device;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisconnect: (reason: string) => void;
  isLoading: boolean;
}

export function DisconnectDeviceDialog({ 
  device, 
  open, 
  onOpenChange, 
  onDisconnect, 
  isLoading 
}: DisconnectDeviceDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDisconnect(reason.trim() || 'Device disconnected by administrator');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5" />
            Disconnect {device.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Device</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="font-medium">{device.name}</div>
              <div className="text-muted-foreground">IP: {device.ipAddress}</div>
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-red-800 dark:text-red-200">Warning</div>
                <div className="text-red-700 dark:text-red-300">
                  This will completely block all network access for this device. 
                  The device will be unable to connect to any websites or services.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Disconnection</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for disconnecting this device..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <WifiOff className="mr-2 h-4 w-4" />
                  Disconnect Device
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}