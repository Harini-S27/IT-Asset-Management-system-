import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import { DeviceNotification } from '@/components/devices/device-notification';
import { Device } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface NotificationItem {
  id: string;
  device: Device;
  type: 'DEVICE_ADDED' | 'DEVICE_UPDATED';
  timestamp: string;
}

export function NotificationManager() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifiedDevices, setNotifiedDevices] = useState<Set<number>>(new Set());
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (lastMessage) {
      const { type, data, timestamp } = lastMessage;
      
      if (type === 'DEVICE_ADDED' || type === 'DEVICE_UPDATED') {
        // Invalidate and refetch device queries
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        
        // Create notification for new devices (only if not already notified)
        if (type === 'DEVICE_ADDED' && !notifiedDevices.has(data.id)) {
          const newNotification: NotificationItem = {
            id: `${data.id}-${timestamp}`,
            device: data,
            type,
            timestamp
          };
          
          setNotifications(prev => [...prev, newNotification]);
          
          // Mark device as notified
          setNotifiedDevices(prev => new Set([...prev, data.id]));
          
          // Show toast notification
          toast({
            title: "New Device Detected",
            description: `${data.name} has been added to your network`,
            duration: 5000,
          });
        }
        
        // For device updates, just show a subtle toast
        if (type === 'DEVICE_UPDATED') {
          toast({
            title: "Device Updated",
            description: `${data.name} information has been updated`,
            duration: 3000,
          });
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
    <div className="fixed top-4 right-4 z-50 space-y-4">
      {notifications.map((notification) => (
        <DeviceNotification
          key={notification.id}
          device={notification.device}
          onDismiss={() => handleDismissNotification(notification.id)}
          onViewDetails={handleAcceptDevice}
        />
      ))}
    </div>
  );
}