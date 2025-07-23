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
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (lastMessage) {
      const { type, data, timestamp } = lastMessage;
      
      if (type === 'DEVICE_ADDED' || type === 'DEVICE_UPDATED') {
        // Invalidate and refetch device queries
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        
        // Create notification for new devices
        if (type === 'DEVICE_ADDED') {
          const newNotification: NotificationItem = {
            id: `${data.id}-${timestamp}`,
            device: data,
            type,
            timestamp
          };
          
          setNotifications(prev => [...prev, newNotification]);
          
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

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleViewDeviceDetails = (device: Device) => {
    // This could navigate to device details or open a modal
    console.log('View device details:', device);
    // For now, just dismiss the notification
    const notificationId = notifications.find(n => n.device.id === device.id)?.id;
    if (notificationId) {
      handleDismissNotification(notificationId);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4">
      {notifications.map((notification) => (
        <DeviceNotification
          key={notification.id}
          device={notification.device}
          onDismiss={() => handleDismissNotification(notification.id)}
          onViewDetails={handleViewDeviceDetails}
        />
      ))}
    </div>
  );
}