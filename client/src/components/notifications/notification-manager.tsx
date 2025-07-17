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

  const createNotificationHistoryMutation = useMutation({
    mutationFn: (notificationData: any) => 
      apiRequest('/api/notifications/history', {
        method: "POST",
        body: notificationData
      }),
  });

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
          // Create notification history record first
          createNotificationHistoryMutation.mutate({
            deviceId: data.id,
            deviceName: data.name,
            deviceModel: data.model,
            deviceType: data.type,
            deviceStatus: data.status,
            deviceLocation: data.location || 'Unknown',
            notificationType: 'DEVICE_ADDED'
          }, {
            onSuccess: (historyRecord: any) => {
              console.log('Notification history created:', historyRecord);
              const newNotification: NotificationItem = {
                id: `${data.id}-${timestamp}`,
                device: data,
                type,
                timestamp,
                notificationHistoryId: historyRecord.id
              };
              
              setNotifications(prev => [...prev, newNotification]);
              console.log('Notification added to state:', newNotification);
              
              // Mark device as notified
              setNotifiedDevices(prev => new Set([...prev, data.id]));
            },
            onError: (error: any) => {
              console.error('Failed to create notification history:', error);
              // Still show notification even if history creation fails
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
          });
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
    
    // Remove device from database when dismissed
    try {
      const response = await fetch(`/api/devices/${notification.device.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove notification
        setNotifications(prev => prev.filter(n => n.id !== id));
        
        // Invalidate device queries to refresh the dashboard
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        
        toast({
          title: "Device Rejected",
          description: `${notification.device.name} has been removed from the system`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error removing device:', error);
      toast({
        title: "Error",
        description: "Failed to remove device from system",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleAcceptDevice = async (device: Device) => {
    console.log('Accepting device:', device);
    
    // Device is already in the system, just mark as accepted
    const notificationId = notifications.find(n => n.device.id === device.id)?.id;
    if (notificationId) {
      // Remove notification (device stays in system)
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: "Device Accepted",
        description: `${device.name} has been accepted into the system`,
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