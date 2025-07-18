import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { DeviceNotification } from '@/components/devices/device-notification';
import { Device } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface NotificationItem {
  id: string;
  device: Device;
  type: 'DEVICE_ADDED' | 'DEVICE_UPDATED';
  timestamp: string;
  notificationHistoryId?: number;
}

export function NotificationManager() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifiedDevices, setNotifiedDevices] = useState<Set<number>>(new Set());
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Notification history is now handled server-side

  useEffect(() => {
    if (lastMessage) {
      const { type, data, timestamp } = lastMessage;
      console.log('Received WebSocket message:', { type, data, timestamp });
      
      if (type === 'DEVICE_ADDED' || type === 'DEVICE_UPDATED') {
        // Invalidate and refetch device queries
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        
        // Create notification for new devices (only if not already notified)
        if (type === 'DEVICE_ADDED' && !notifiedDevices.has(data.id)) {
          console.log('Creating notification for new device:', data.name);
          console.log('Notified devices:', notifiedDevices);
          
          // Create notification directly (history is handled server-side)
          const newNotification: NotificationItem = {
            id: `${data.id}-${timestamp}`,
            device: data,
            type,
            timestamp
          };
          
          setNotifications(prev => [...prev, newNotification]);
          console.log('Notification added to state (without history):', newNotification);
          
          // Mark device as notified
          setNotifiedDevices(prev => new Set([...prev, data.id]));
        }
        
        // For device updates, just record in history (no toast notification)
        if (type === 'DEVICE_UPDATED') {
          // Silent update - no toast notification to avoid spam
          // History is already recorded in the server-side endpoint
        }
      }
    }
  }, [lastMessage, queryClient, toast]);

  const handleDismissNotification = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;
    
    // Reject pending device
    try {
      const response = await fetch(`/api/devices/reject/${notification.device.id}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Remove notification
        setNotifications(prev => prev.filter(n => n.id !== id));
        
        // Invalidate device queries to refresh the dashboard
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        
        toast({
          title: "Device Rejected",
          description: `${notification.device.name} has been rejected and will not be added to the system`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error rejecting device:', error);
      toast({
        title: "Error",
        description: "Failed to reject device",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleAcceptDevice = async (device: Device) => {
    console.log('Accepting device:', device);
    
    // Approve pending device
    try {
      const response = await fetch(`/api/devices/approve/${device.id}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Remove notification
        const notificationId = notifications.find(n => n.device.id === device.id)?.id;
        if (notificationId) {
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
        
        // Invalidate device queries to refresh the dashboard
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        
        toast({
          title: "Device Accepted",
          description: `${device.name} has been approved and added to the dashboard`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error approving device:', error);
      toast({
        title: "Error",
        description: "Failed to approve device",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="fixed top-4 left-4 z-50 space-y-4">

      {notifications.map((notification) => (
        <DeviceNotification
          key={notification.id}
          device={notification.device}
          onDismiss={() => handleDismissNotification(notification.id)}
          onViewDetails={handleAcceptDevice}
          notificationHistoryId={notification.notificationHistoryId}
        />
      ))}
    </div>
  );
}