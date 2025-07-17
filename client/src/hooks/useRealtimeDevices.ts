import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { Device } from '@shared/schema';

export function useRealtimeDevices() {
  const [newDeviceIds, setNewDeviceIds] = useState<number[]>([]);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<number[]>([]);
  const { lastMessage } = useWebSocket();

  // Fetch devices using React Query
  const { data: devices = [], isLoading, error, refetch } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;
      
      if (type === 'DEVICE_ADDED') {
        // Add to new devices list
        setNewDeviceIds(prev => {
          if (!prev.includes(data.id)) {
            return [...prev, data.id];
          }
          return prev;
        });
        
        // Remove from new devices after 10 seconds
        setTimeout(() => {
          setNewDeviceIds(prev => prev.filter(id => id !== data.id));
        }, 10000);
      }
      
      if (type === 'DEVICE_UPDATED') {
        // Add to recently updated list
        setRecentlyUpdatedIds(prev => {
          if (!prev.includes(data.id)) {
            return [...prev, data.id];
          }
          return prev;
        });
        
        // Remove from recently updated after 5 seconds
        setTimeout(() => {
          setRecentlyUpdatedIds(prev => prev.filter(id => id !== data.id));
        }, 5000);
      }
    }
  }, [lastMessage]);

  // Stats calculations
  const stats = {
    total: devices.length,
    active: devices.filter(d => d.status === 'Active').length,
    inactive: devices.filter(d => d.status === 'Inactive').length,
    maintenance: devices.filter(d => d.status === 'Maintenance').length,
    damage: devices.filter(d => d.status === 'Damage').length,
    abnormal: devices.filter(d => d.status === 'Abnormal').length,
    newDevices: newDeviceIds.length,
    recentlyUpdated: recentlyUpdatedIds.length,
  };

  // Device type breakdown (filter out Unknown devices)
  const deviceTypes = devices.reduce((acc, device) => {
    if (device.type !== 'Unknown') {
      acc[device.type] = (acc[device.type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Location breakdown
  const locations = devices.reduce((acc, device) => {
    acc[device.location] = (acc[device.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    devices,
    isLoading,
    error,
    refetch,
    stats,
    deviceTypes,
    locations,
    newDeviceIds,
    recentlyUpdatedIds,
  };
}