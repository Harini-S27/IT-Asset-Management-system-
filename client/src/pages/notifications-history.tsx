import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Calendar, Clock, Filter, Check, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { NotificationHistory } from "@shared/schema";

export function NotificationsHistoryPage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications/history"],
    queryFn: () => fetch("/api/notifications/history").then(res => res.json()) as Promise<NotificationHistory[]>,
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => 
      apiRequest(`/api/notifications/history/${id}/action`, {
        method: "PATCH",
        body: { action }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/history"] });
    },
  });

  const filteredNotifications = notifications.filter(notification => {
    const typeMatch = filterType === "all" || notification.notificationType === filterType;
    const actionMatch = filterAction === "all" || 
      (filterAction === "pending" && !notification.action) ||
      notification.action === filterAction;
    return typeMatch && actionMatch;
  });

  const getStatusBadge = (action: string | null) => {
    if (!action) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
    if (action === "accepted") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
    }
    if (action === "dismissed") {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Dismissed</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DEVICE_ADDED":
        return "📱";
      case "DEVICE_UPDATED":
        return "🔄";
      default:
        return "🔔";
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "DEVICE_ADDED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Device Added</Badge>;
      case "DEVICE_UPDATED":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Device Updated</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notification History</h1>
            <p className="text-sm text-gray-600">
              View and manage all device notification records
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notification Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DEVICE_ADDED">Device Added</SelectItem>
                  <SelectItem value="DEVICE_UPDATED">Device Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Status</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {notifications.filter(n => !n.action).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-green-600">
                  {notifications.filter(n => n.action === "accepted").length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dismissed</p>
                <p className="text-2xl font-bold text-gray-600">
                  {notifications.filter(n => n.action === "dismissed").length}
                </p>
              </div>
              <X className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications ({filteredNotifications.length})</CardTitle>
          <CardDescription>
            Complete history of device notifications and admin actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">No notifications match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{getTypeIcon(notification.notificationType)}</span>
                        <div className="flex items-center gap-2">
                          {getTypeBadge(notification.notificationType)}
                          {getStatusBadge(notification.action)}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-medium text-gray-900">
                          {notification.deviceName} ({notification.deviceModel})
                        </h4>
                        <div className="text-sm text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <span><strong>Type:</strong> {notification.deviceType}</span>
                          <span><strong>Status:</strong> {notification.deviceStatus}</span>
                          <span><strong>Location:</strong> {notification.deviceLocation}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(notification.timestamp), "MMM dd, yyyy HH:mm")}
                          </span>
                        </div>
                        
                        {notification.action && notification.actionTimestamp && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-2">
                            <Clock className="h-3 w-3" />
                            Action taken: {format(new Date(notification.actionTimestamp), "MMM dd, yyyy HH:mm")}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!notification.action && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => updateActionMutation.mutate({ 
                            id: notification.id, 
                            action: "accepted" 
                          })}
                          disabled={updateActionMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-200 text-gray-700 hover:bg-gray-50"
                          onClick={() => updateActionMutation.mutate({ 
                            id: notification.id, 
                            action: "dismissed" 
                          })}
                          disabled={updateActionMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}