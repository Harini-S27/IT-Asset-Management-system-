import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Device } from '@shared/schema';
import { Activity, Monitor, Laptop, Server, Smartphone, Camera, Wifi } from 'lucide-react';

interface LiveDeviceCounterProps {
  devices: Device[];
}

export function LiveDeviceCounter({ devices }: LiveDeviceCounterProps) {
  const [animatingCount, setAnimatingCount] = useState(0);
  const totalDevices = devices.length;

  useEffect(() => {
    if (totalDevices > animatingCount) {
      const timer = setTimeout(() => {
        setAnimatingCount(prev => Math.min(prev + 1, totalDevices));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [totalDevices, animatingCount]);

  const getDeviceTypeStats = () => {
    const stats: Record<string, number> = {};
    devices.forEach(device => {
      // Filter out Unknown device types
      if (device.type !== 'Unknown') {
        stats[device.type] = (stats[device.type] || 0) + 1;
      }
    });
    return stats;
  };

  const getStatusStats = () => {
    const stats: Record<string, number> = {};
    devices.forEach(device => {
      stats[device.status] = (stats[device.status] || 0) + 1;
    });
    return stats;
  };

  const getLocationStats = () => {
    const stats: Record<string, number> = {};
    devices.forEach(device => {
      stats[device.location] = (stats[device.location] || 0) + 1;
    });
    return stats;
  };

  const typeStats = getDeviceTypeStats();
  const statusStats = getStatusStats();
  const locationStats = getLocationStats();

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Workstation':
        return <Monitor className="h-4 w-4" />;
      case 'Laptop':
        return <Laptop className="h-4 w-4" />;
      case 'Server':
        return <Server className="h-4 w-4" />;
      case 'Mobile':
      case 'Mobile Phone':
        return <Smartphone className="h-4 w-4" />;
      case 'Security Camera':
        return <Camera className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'Damage':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Devices Counter */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Live Device Count</CardTitle>
          <Activity className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {animatingCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Devices currently monitored
          </p>
        </CardContent>
      </Card>

      {/* Device Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Device Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(typeStats).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getDeviceIcon(type)}
                  <span className="text-sm">{type}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statusStats).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm">{status}</span>
                <Badge className={getStatusColor(status)}>
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Distribution */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Location Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(locationStats).map(([location, count]) => (
              <div key={location} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{location}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}