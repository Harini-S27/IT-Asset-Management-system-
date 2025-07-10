import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Device } from '@shared/schema';
import { 
  Monitor, 
  Laptop, 
  Smartphone, 
  Server, 
  Camera, 
  Wifi, 
  MapPin, 
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Settings,
  Eye,
  Edit,
  Trash2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedDeviceListProps {
  devices: Device[];
  onEditDevice?: (device: Device) => void;
  onDeleteDevice?: (device: Device) => void;
  onViewDetails?: (device: Device) => void;
  newDeviceIds?: number[];
}

export function AnimatedDeviceList({ 
  devices, 
  onEditDevice, 
  onDeleteDevice, 
  onViewDetails,
  newDeviceIds = []
}: AnimatedDeviceListProps) {
  const [highlightedDevices, setHighlightedDevices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (newDeviceIds.length > 0) {
      const newHighlighted = new Set(newDeviceIds);
      setHighlightedDevices(newHighlighted);
      
      // Remove highlight after 5 seconds
      const timeout = setTimeout(() => {
        setHighlightedDevices(new Set());
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [newDeviceIds]);

  const getDeviceIcon = (type: string) => {
    const iconProps = { className: "h-5 w-5" };
    switch (type) {
      case 'Workstation':
        return <Monitor {...iconProps} />;
      case 'Laptop':
        return <Laptop {...iconProps} />;
      case 'Mobile':
      case 'Mobile Phone':
        return <Smartphone {...iconProps} />;
      case 'Server':
        return <Server {...iconProps} />;
      case 'Security Camera':
        return <Camera {...iconProps} />;
      default:
        return <Wifi {...iconProps} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Damage':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Abnormal':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Inactive':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'Maintenance':
        return <Settings className="h-4 w-4 text-yellow-600" />;
      case 'Damage':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'Abnormal':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {devices.map((device) => {
          const isHighlighted = highlightedDevices.has(device.id);
          
          return (
            <motion.div
              key={device.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }
              }}
              exit={{ 
                opacity: 0, 
                y: -20, 
                scale: 0.95,
                transition: { duration: 0.2 }
              }}
              className={cn(
                "relative",
                isHighlighted && "animate-pulse-subtle"
              )}
            >
              <Card className={cn(
                "transition-all duration-300 hover:shadow-lg",
                isHighlighted && "ring-2 ring-blue-400 shadow-lg bg-blue-50/50"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg",
                        isHighlighted ? "bg-blue-100" : "bg-gray-100"
                      )}>
                        {getDeviceIcon(device.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg font-semibold truncate">
                            {device.name}
                          </CardTitle>
                          {isHighlighted && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center"
                            >
                              <Sparkles className="h-4 w-4 text-blue-600" />
                              <Badge className="ml-1 bg-blue-100 text-blue-800 animate-pulse">
                                New!
                              </Badge>
                            </motion.div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {device.model}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={cn("text-xs", getStatusColor(device.status))}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(device.status)}
                          <span>{device.status}</span>
                        </span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="font-medium">Type:</span>
                      <span className="truncate">{device.type}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">Location:</span>
                      <span className="truncate">{device.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Wifi className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">IP:</span>
                      <span className="truncate">{device.ipAddress || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        Updated: {device.lastUpdated 
                          ? new Date(device.lastUpdated).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {onViewDetails && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails(device)}
                          className="h-8 px-3 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                      {onEditDevice && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditDevice(device)}
                          className="h-8 px-3 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {onDeleteDevice && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteDevice(device)}
                          className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {devices.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="text-gray-500">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No devices found</p>
            <p className="text-sm">Devices will appear here when they're added to your network</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Custom CSS for subtle pulse animation
const pulseKeyframes = `
@keyframes animate-pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}

.animate-pulse-subtle {
  animation: animate-pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}