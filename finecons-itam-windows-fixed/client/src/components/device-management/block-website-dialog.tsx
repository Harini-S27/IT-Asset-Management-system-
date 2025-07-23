import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Shield, Loader2 } from 'lucide-react';

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  macAddress?: string;
}

interface BlockWebsiteDialogProps {
  device: Device;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockWebsiteDialog({ device, open, onOpenChange }: BlockWebsiteDialogProps) {
  const { toast } = useToast();
  const [domain, setDomain] = useState('');
  const [reason, setReason] = useState('');

  const blockMutation = useMutation({
    mutationFn: async (data: { domain: string; reason: string }) => {
      const response = await fetch('/api/device-management/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          deviceIp: device.ipAddress,
          macAddress: device.macAddress,
          domain: data.domain,
          reason: data.reason,
          performedBy: 'admin'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to block website');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Website Blocked",
        description: `Successfully blocked ${domain} for ${device.name}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/device-management/${device.id}/status`] });
      setDomain('');
      setReason('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Block Failed",
        description: error.message || "Failed to block website",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain.trim()) {
      toast({
        title: "Domain Required",
        description: "Please enter a domain to block",
        variant: "destructive"
      });
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    if (!domainRegex.test(cleanDomain)) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain (e.g., facebook.com)",
        variant: "destructive"
      });
      return;
    }

    blockMutation.mutate({
      domain: cleanDomain,
      reason: reason.trim() || 'Blocked by administrator'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Block Website for {device.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-info">Device</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="font-medium">{device.name}</div>
              <div className="text-muted-foreground">IP: {device.ipAddress}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain to Block</Label>
            <Input
              id="domain"
              placeholder="facebook.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={blockMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Enter the domain without http:// or www. (e.g., facebook.com, youtube.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Reason for blocking this website..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={blockMutation.isPending}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={blockMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={blockMutation.isPending || !domain.trim()}
            >
              {blockMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Blocking...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Block Website
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}