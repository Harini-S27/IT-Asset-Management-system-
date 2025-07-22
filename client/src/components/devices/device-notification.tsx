import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Plus, Wifi, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Device } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface DeviceNotificationProps {
  device: Device;
  onDismiss: () => void;
  onViewDetails: (device: Device) => void;
  notificationHistoryId?: number;
  type?: 'DEVICE_ADDED' | 'DEVICE_UPDATED' | 'ASSET_RETIREMENT_ALERT';
  retirementData?: any;
}

export function DeviceNotification({ device, onDismiss, onViewDetails, notificationHistoryId, type = 'DEVICE_ADDED', retirementData }: DeviceNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const updateNotificationMutation = useMutation({
    mutationFn: async (action: string) => {
      console.log('Mutation called with action:', action);
      if (!notificationHistoryId) {
        console.log('No notificationHistoryId, skipping API call');
        return;
      }
      const response = await fetch(`/api/notifications/history/${notificationHistoryId}/action`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!response.ok) throw new Error('Failed to update notification');
    },
  });

  const handleAccept = () => {
    updateNotificationMutation.mutate("accepted");
    onViewDetails(device);
  };

  const handleDismiss = () => {
    console.log('handleDismiss called - Dismissing notification...');
    console.log('Notification type:', isRetirementAlert ? 'retirement' : 'device');
    console.log('Has notificationHistoryId:', !!notificationHistoryId);
    console.log('Calling onDismiss function...');
    
    // Always dismiss locally - no API calls needed for retirement alerts
    onDismiss();
    console.log('onDismiss called successfully');
  };

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

  // Retirement alert specific styling and content
  const isRetirementAlert = type === 'ASSET_RETIREMENT_ALERT';
  
  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 transition-all duration-500 ease-out",
      isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    )}>
      <Card className={cn(
        "w-96 shadow-lg border-l-4 bg-white",
        isRetirementAlert ? "border-l-orange-500" : "border-l-green-500"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {isRetirementAlert ? (
                  <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                ) : (
                  getDeviceIcon(device.type)
                )}
                <div className={cn(
                  "absolute -top-1 -right-1 h-3 w-3 rounded-full animate-pulse",
                  isRetirementAlert ? "bg-orange-500" : "bg-green-500"
                )}></div>
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900 flex items-center">
                  {isRetirementAlert ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-600 mr-1" />
                      Asset Retirement Alert
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 text-green-600 mr-1" />
                      New Device Detected
                    </>
                  )}
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
              onClick={handleDismiss}
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
                <p className="text-sm text-gray-600">
                  {isRetirementAlert ? retirementData?.message : device.model}
                </p>
              </div>
              <Badge className={cn(
                "text-xs",
                isRetirementAlert ? "bg-orange-100 text-orange-800 border-orange-200" : getStatusColor(device.status)
              )}>
                {isRetirementAlert ? `${retirementData?.daysUntilRetirement} days` : device.status}
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

            {isRetirementAlert ? (
              <div className="flex space-x-2 pt-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Check Now button clicked - navigating to asset lifecycle page...');
                    setLocation('/asset-lifecycle');
                    setTimeout(() => {
                      console.log('Auto-dismissing notification after navigation');
                      handleDismiss();
                    }, 200);
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Check Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Dismiss button clicked for retirement alert');
                    handleDismiss();
                  }}
                  className="flex-1"
                  disabled={updateNotificationMutation.isPending}
                >
                  Dismiss
                </Button>
              </div>
            ) : (
              <div className="flex space-x-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={updateNotificationMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex-1"
                  disabled={updateNotificationMutation.isPending}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}