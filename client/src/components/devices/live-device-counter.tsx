import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Device } from '@shared/schema';

interface LiveDeviceCounterProps {
  devices: Device[];
}

export function LiveDeviceCounter({ devices }: LiveDeviceCounterProps) {
  const [previousCount, setPreviousCount] = useState(0);
  const [isNewDevice, setIsNewDevice] = useState(false);
  
  useEffect(() => {
    const currentCount = devices.length;
    if (previousCount > 0 && currentCount > previousCount) {
      setIsNewDevice(true);
      const timer = setTimeout(() => setIsNewDevice(false), 3000);
      return () => clearTimeout(timer);
    }
    setPreviousCount(currentCount);
  }, [devices.length, previousCount]);

  const activeDevices = devices.filter(d => d.status === 'Active').length;
  const inactiveDevices = devices.filter(d => d.status === 'Inactive').length;
  const recentDevices = devices.filter(d => {
    const lastUpdated = new Date(d.lastUpdated as any);
    const now = new Date();
    return (now.getTime() - lastUpdated.getTime()) < 24 * 60 * 60 * 1000; // 24 hours
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className={cn(
        "transition-all duration-300",
        isNewDevice && "ring-2 ring-green-500 bg-green-50"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          <div className="relative">
            <Activity className="h-4 w-4 text-blue-600" />
            {isNewDevice && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "text-2xl font-bold transition-all duration-300",
              isNewDevice ? "text-green-600" : "text-blue-600"
            )}>
              {devices.length}
            </div>
            {isNewDevice && (
              <Badge className="bg-green-100 text-green-800 animate-pulse">
                <TrendingUp className="h-3 w-3 mr-1" />
                New!
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isNewDevice ? "Device just added!" : "Monitored assets"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{activeDevices}</div>
          <p className="text-xs text-muted-foreground">
            {((activeDevices / devices.length) * 100).toFixed(1)}% operational
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactive Devices</CardTitle>
          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{inactiveDevices}</div>
          <p className="text-xs text-muted-foreground">
            {((inactiveDevices / devices.length) * 100).toFixed(1)}% offline
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Clock className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{recentDevices}</div>
          <p className="text-xs text-muted-foreground">
            Updated in last 24h
          </p>
        </CardContent>
      </Card>
    </div>
  );
}