import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Plus, Wifi, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Device } from '@shared/schema';

interface DeviceNotificationProps {
  device: Device;
  onDismiss: () => void;
  onViewDetails: (device: Device) => void;
}

export function DeviceNotification({ device, onDismiss, onViewDetails }: DeviceNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Workstation':
        return <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <div className="h-4 w-4 bg-blue-600 rounded-sm"></div>
        </div>;
      case 'Laptop':
        return <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
          <div className="h-4 w-4 bg-green-600 rounded border-t-2 border-green-700"></div>
        </div>;
      case 'Security Camera':
        return <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
        </div>;
      case 'Mobile':
      case 'Mobile Phone':
        return <div className="h-8 w-8 bg-pink-100 rounded-lg flex items-center justify-center">
          <div className="h-4 w-2 bg-pink-600 rounded-sm"></div>
        </div>;
      case 'Server':
        return <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="h-4 w-4 bg-gray-600 rounded-sm"></div>
        </div>;
      default:
        return <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Wifi className="h-4 w-4 text-blue-600" />
        </div>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Inactive':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Damage':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 transition-all duration-500 ease-out",
      isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    )}>
      <Card className="w-96 shadow-lg border-l-4 border-l-green-500 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {getDeviceIcon(device.type)}
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900 flex items-center">
                  <Plus className="h-4 w-4 text-green-600 mr-1" />
                  New Device Detected
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{device.name}</h3>
                <p className="text-sm text-gray-600">{device.model}</p>
              </div>
              <Badge className={cn("text-xs", getStatusColor(device.status))}>
                {device.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span className="font-medium">Type:</span>
                <span className="ml-1">{device.type}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="font-medium">Location:</span>
                <span className="ml-1 truncate">{device.location}</span>
              </div>
              {device.ipAddress && (
                <div className="flex items-center text-gray-600 col-span-2">
                  <Wifi className="h-3 w-3 mr-1" />
                  <span className="font-medium">IP:</span>
                  <span className="ml-1">{device.ipAddress}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <Button
                size="sm"
                onClick={() => onViewDetails(device)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="flex-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}