import { useState, useEffect, useRef } from 'react';
import { Device } from '@shared/schema';

export function useDeviceNotifications(devices: Device[]) {
  const [notifications, setNotifications] = useState<Device[]>([]);
  const previousDevicesRef = useRef<Device[]>([]);

  useEffect(() => {
    const previousDevices = previousDevicesRef.current;
    
    if (previousDevices.length > 0) {
      // Find new devices by comparing current devices with previous
      const newDevices = devices.filter(currentDevice => 
        !previousDevices.some(prevDevice => prevDevice.id === currentDevice.id)
      );

      if (newDevices.length > 0) {
        setNotifications(prev => [...prev, ...newDevices]);
      }
    }
    
    previousDevicesRef.current = devices;
  }, [devices]);

  const dismissNotification = (deviceId: number) => {
    setNotifications(prev => prev.filter(device => device.id !== deviceId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    dismissNotification,
    clearAllNotifications
  };
}