import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealtimeDevices } from '@/hooks/useRealtimeDevices';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Activity, 
  Monitor, 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  TrendingUp, 
  Wifi,
  Clock,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function RealtimeStats() {
  const { stats, deviceTypes, locations, newDeviceIds, recentlyUpdatedIds } = useRealtimeDevices();
  const { isConnected, connectionStatus } = useWebSocket();

  const statsCards = [
    {
      title: "Total Devices",
      value: stats.total,
      icon: Monitor,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "All managed devices",
      isHighlighted: newDeviceIds.length > 0
    },
    {
      title: "Active",
      value: stats.active,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Online and operational",
      isHighlighted: false
    },
    {
      title: "Inactive",
      value: stats.inactive,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      description: "Offline or unreachable",
      isHighlighted: false
    },
    {
      title: "Maintenance",
      value: stats.maintenance,
      icon: Settings,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      description: "Under maintenance",
      isHighlighted: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Device Management</h2>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}>
            {isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            )}
          </div>
          <span className="text-sm text-gray-600">
            {isConnected ? "Live Updates" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "transition-all duration-300",
              stat.isHighlighted && "ring-2 ring-blue-400 shadow-lg"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={cn("h-4 w-4", stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "text-2xl font-bold transition-all duration-300",
                    stat.color,
                    stat.isHighlighted && "scale-110"
                  )}>
                    {stat.value}
                  </div>
                  {stat.isHighlighted && (
                    <Badge className="bg-blue-100 text-blue-800 animate-pulse">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{newDeviceIds.length}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      {(stats.newDevices > 0 || stats.recentlyUpdated > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2"
        >
          {stats.newDevices > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  New Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.newDevices}
                </div>
                <p className="text-xs text-green-700">
                  Added in the last 10 minutes
                </p>
              </CardContent>
            </Card>
          )}
          
          {stats.recentlyUpdated > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recently Updated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.recentlyUpdated}
                </div>
                <p className="text-xs text-blue-700">
                  Updated in the last 5 minutes
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Device Types & Locations - Sequential Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Device Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {Object.entries(deviceTypes)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count], index) => (
                  <div key={type} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              {Object.keys(deviceTypes).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No device types available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {Object.entries(locations)
                .sort(([,a], [,b]) => b - a)
                .map(([location, count], index) => (
                  <div key={location} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{location}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              {Object.keys(locations).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No locations available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Wifi className="h-5 w-5 mr-2" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}></div>
              <span className="text-sm">
                WebSocket: {connectionStatus}
              </span>
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {isConnected 
              ? "Real-time updates are active. New devices will appear automatically."
              : "Connection lost. Attempting to reconnect..."
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}