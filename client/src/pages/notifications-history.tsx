import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Calendar, Clock, Filter, Check, X, Eye, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { NotificationHistory } from "@shared/schema";

export function NotificationsHistoryPage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications/history"],
    queryFn: () => fetch("/api/notifications/history").then(res => res.json()) as Promise<NotificationHistory[]>,
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => 
      apiRequest(`/api/notifications/history/${id}/action`, "PATCH", { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/history"] });
      setIsDialogOpen(false);
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

      {/* Compact Notifications Dropdown */}
      <Card>
        <CardContent className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between h-12 text-left"
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">View Notifications ({filteredNotifications.length})</div>
                    <div className="text-sm text-gray-500">Click to browse notification history</div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="p-0" 
              align="start"
              sideOffset={8}
              style={{ width: 'calc(100vw - 16rem)' }}
            >
              <div className="p-4 border-b">
                <div className="flex gap-4">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="DEVICE_ADDED">Device Added</SelectItem>
                      <SelectItem value="DEVICE_UPDATED">Device Updated</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
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
              
              <ScrollArea className="h-80">
                <div className="p-4">
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
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedNotification(notification);
                            setIsDialogOpen(true);
                          }}
                        >
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
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {notification.timestamp ? format(new Date(notification.timestamp), "MMM dd, yyyy HH:mm") : "N/A"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {/* Notification Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedNotification && getTypeIcon(selectedNotification.notificationType)}</span>
              Notification Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getTypeBadge(selectedNotification.notificationType)}
                {getStatusBadge(selectedNotification.action)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-900">Device Name</label>
                  <p className="text-gray-600">{selectedNotification.deviceName}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-900">Model</label>
                  <p className="text-gray-600">{selectedNotification.deviceModel}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-900">Type</label>
                  <p className="text-gray-600">{selectedNotification.deviceType}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-900">Status</label>
                  <p className="text-gray-600">{selectedNotification.deviceStatus}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-900">Location</label>
                  <p className="text-gray-600">{selectedNotification.deviceLocation}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-900">Timestamp</label>
                  <p className="text-gray-600">{selectedNotification.timestamp ? format(new Date(selectedNotification.timestamp), "MMM dd, yyyy HH:mm") : "N/A"}</p>
                </div>
              </div>
              
              {selectedNotification.action && selectedNotification.actionTimestamp && (
                <div className="border-t pt-4">
                  <label className="font-medium text-gray-900">Action History</label>
                  <p className="text-sm text-gray-600">
                    Action: {selectedNotification.action} on {format(new Date(selectedNotification.actionTimestamp), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              )}
              
              {!selectedNotification.action && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => updateActionMutation.mutate({ 
                      id: selectedNotification.id, 
                      action: "accepted" 
                    })}
                    disabled={updateActionMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => updateActionMutation.mutate({ 
                      id: selectedNotification.id, 
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}