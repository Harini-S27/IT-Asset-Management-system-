import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Calendar, Clock, Check, X, Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { NotificationHistory } from "@shared/schema";

export function NotificationsHistoryPage() {
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

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

  // Filter notifications by acceptance status
  const acceptedNotifications = notifications.filter(n => n.action === "accepted");
  const declinedNotifications = notifications.filter(n => n.action === "dismissed" || (!n.action && n.notificationType));

  const filterNotificationsBySearch = (notifs: NotificationHistory[]) => {
    if (!searchTerm) return notifs;
    return notifs.filter(n => 
      n.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.notificationType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getPaginatedData = (data: NotificationHistory[]) => {
    const filteredData = filterNotificationsBySearch(data);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      items: filteredData.slice(startIndex, endIndex),
      totalItems: filteredData.length,
      totalPages: Math.ceil(filteredData.length / itemsPerPage)
    };
  };

  const getStatusBadge = (action: string | null) => {
    if (!action) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
    if (action === "accepted") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
    }
    if (action === "dismissed") {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Declined</Badge>;
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

  const renderNotificationTable = (data: NotificationHistory[]) => {
    const paginatedData = getPaginatedData(data);
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-80"
            />
          </div>
          <div className="text-sm text-gray-600">
            Showing {paginatedData.items.length} of {paginatedData.totalItems} notifications
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-medium text-sm text-gray-700">
            <div className="col-span-1">Type</div>
            <div className="col-span-3">Device</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Actions</div>
          </div>
          
          {paginatedData.items.map((notification) => (
            <div key={notification.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50">
              <div className="col-span-1 flex items-center">
                <span className="text-lg">{getTypeIcon(notification.notificationType)}</span>
              </div>
              <div className="col-span-3">
                <div className="font-medium text-gray-900">{notification.deviceName}</div>
                <div className="text-sm text-gray-500">{notification.notificationType.replace('_', ' ')}</div>
              </div>
              <div className="col-span-2 flex items-center">
                {getStatusBadge(notification.action)}
              </div>
              <div className="col-span-2 flex items-center text-sm text-gray-600">
                {notification.timestamp ? format(new Date(notification.timestamp), "MMM dd, yyyy") : "N/A"}
              </div>
              <div className="col-span-2 flex items-center text-sm text-gray-600">
                {notification.timestamp ? format(new Date(notification.timestamp), "HH:mm:ss") : "N/A"}
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedNotification(notification);
                    setIsDialogOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {paginatedData.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {paginatedData.totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex space-x-1">
                {[...Array(Math.min(5, paginatedData.totalPages))].map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                disabled={currentPage === paginatedData.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification History</h1>
        <p className="text-gray-600">View and manage all device notification records</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
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
                <p className="text-2xl font-bold text-green-600">{acceptedNotifications.length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Declined</p>
                <p className="text-2xl font-bold text-red-600">{declinedNotifications.length}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="accepted" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accepted" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Accepted Notifications ({acceptedNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Declined Notifications ({declinedNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accepted">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Accepted Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderNotificationTable(acceptedNotifications)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="declined">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-600" />
                Declined Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderNotificationTable(declinedNotifications, true)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedNotification && getTypeIcon(selectedNotification.notificationType)}</span>
              Notification Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Device Name</label>
                  <p className="text-lg font-semibold">{selectedNotification.deviceName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-lg">{selectedNotification.notificationType.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedNotification.action)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Timestamp</label>
                  <p className="text-lg">{selectedNotification.timestamp ? format(new Date(selectedNotification.timestamp), "PPpp") : "N/A"}</p>
                </div>
              </div>
              
              {selectedNotification.deviceId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Device ID</label>
                  <p className="text-lg font-mono">{selectedNotification.deviceId}</p>
                </div>
              )}
              

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}