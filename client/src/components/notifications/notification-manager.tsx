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
  type: 'DEVICE_ADDED' | 'DEVICE_UPDATED' | 'ASSET_RETIREMENT_ALERT';
  timestamp: string;
  notificationHistoryId?: number;
  retirementData?: any;
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
      
      // Handle asset retirement alerts
      if (type === 'ASSET_RETIREMENT_ALERT') {
        console.log('Received asset retirement alert:', data);
        
        // Create retirement notification 
        const retirementNotification: NotificationItem = {
          id: `retirement-${data.deviceId}-${timestamp}`,
          device: {
            id: data.deviceId,
            name: data.deviceName,
            model: 'Asset Retirement',
            type: 'Asset',
            status: 'Retiring',
            location: 'Asset Management',
            ipAddress: '',
            latitude: '0',
            longitude: '0',
            lastUpdated: timestamp
          },
          type: 'ASSET_RETIREMENT_ALERT',
          timestamp,
          retirementData: data
        };
        
        setNotifications(prev => [...prev, retirementNotification]);
        console.log('Asset retirement notification added:', retirementNotification);
      }
    }
  }, [lastMessage, queryClient, toast]);

  const handleDismissNotification = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) {
      console.log('No notification found with id:', id);
      return;
    }
    
    console.log('Dismissing notification:', notification.type, id);
    
    // For retirement alerts, just dismiss locally
    if (notification.type === 'ASSET_RETIREMENT_ALERT') {
      console.log('Dismissing retirement alert locally, current notifications:', notifications.length);
      console.log('Removing notification with id:', id);
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== id);
        console.log('Notifications after filtering:', filtered.length);
        return filtered;
      });
      console.log('Retirement alert dismissed successfully');
      return;
    }
    
    // For device notifications, reject via API
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
      } else {
        console.log('API rejection failed, dismissing locally');
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error rejecting device:', error);
      // Even if API fails, dismiss locally
      setNotifications(prev => prev.filter(n => n.id !== id));
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
          type={notification.type}
          retirementData={notification.retirementData}
        />
      ))}
    </div>
  );
}