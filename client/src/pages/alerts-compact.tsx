import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  Plus, 
  CheckCircle,
  XCircle,
  Bell,
  Settings,
  Eye,
  ChevronDown,
  Calendar,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Alert } from "@shared/schema";

const SEVERITY_COLORS = {
  Low: "bg-blue-100 text-blue-800 border-blue-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Critical: "bg-red-100 text-red-800 border-red-200"
};

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-800",
  Acknowledged: "bg-yellow-100 text-yellow-800",
  Resolved: "bg-gray-100 text-gray-800",
  Dismissed: "bg-red-100 text-red-800"
};

const ALERT_ICONS = {
  warranty_expiration: <Shield className="h-4 w-4" />,
  end_of_life: <Clock className="h-4 w-4" />,
  compliance_violation: <AlertTriangle className="h-4 w-4" />,
  security_risk: <Shield className="h-4 w-4" />,
  maintenance_due: <Settings className="h-4 w-4" />
};

export default function AlertsCompactPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json() as Promise<Alert[]>;
    }
  });

  // Update alert status mutation
  const updateAlertStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/alerts/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update alert status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: "Success",
        description: "Alert status updated successfully",
      });
    }
  });

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const statusMatch = filterStatus === 'all' || alert.status === filterStatus;
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    return statusMatch && severityMatch;
  });

  // Get alert statistics
  const alertStats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'Active').length,
    critical: alerts.filter(a => a.severity === 'Critical').length,
    warranty: alerts.filter(a => a.alertType === 'warranty_expiration').length,
    endOfLife: alerts.filter(a => a.alertType === 'end_of_life').length
  };

  const handleStatusUpdate = (alert: Alert, newStatus: string) => {
    updateAlertStatus.mutate({ id: alert.id, status: newStatus });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Alert Management</h1>
          <p className="text-gray-600 mt-1">Monitor warranty expiration, end-of-life, and compliance alerts</p>
        </div>
        <Button className="bg-[#4299E1] hover:bg-[#4299E1]/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{alertStats.total}</div>
            <div className="text-sm text-gray-600">Total Alerts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">{alertStats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold text-red-600">{alertStats.critical}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold text-orange-600">{alertStats.warranty}</div>
            <div className="text-sm text-gray-600">Warranty</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">{alertStats.endOfLife}</div>
            <div className="text-sm text-gray-600">End of Life</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Acknowledged">Acknowledged</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
            <SelectItem value="Dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scrollable Alert Dropdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Alert Management
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  View Alerts ({filteredAlerts.length})
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 max-h-80 overflow-y-auto">
                {alertsLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Loading alerts...</div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No alerts found
                  </div>
                ) : (
                  filteredAlerts.map((alert, index) => (
                    <div key={alert.id}>
                      <DropdownMenuItem 
                        className="p-4 cursor-pointer"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <div className="text-blue-600 mt-1">
                            {ALERT_ICONS[alert.alertType as keyof typeof ALERT_ICONS] || <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {alert.alertTitle}
                            </div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {alert.alertType === 'warranty_expiration' && 'Device warranty expires in 30 days'}
                              {alert.alertType === 'maintenance_due' && 'Scheduled maintenance is overdue'}  
                              {alert.alertType === 'end_of_life' && 'Asset scheduled for retirement'}
                              {alert.alertType === 'compliance_violation' && 'Compliance policy violation detected'}
                              {alert.alertType === 'security_risk' && 'Security risk assessment required'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Device: {alert.deviceId} • {new Date(alert.alertDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={`text-xs px-2 py-1 ${SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS]}`}>
                                {alert.severity}
                              </Badge>
                              <Badge className={`text-xs px-2 py-1 ${STATUS_COLORS[alert.status as keyof typeof STATUS_COLORS]}`}>
                                {alert.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      {index < filteredAlerts.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <div className="text-lg font-medium mb-2">Alert Management</div>
            <div className="text-sm">Click "View Alerts" above to browse and manage all system alerts</div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  {ALERT_ICONS[selectedAlert.alertType as keyof typeof ALERT_ICONS]}
                  <span className="ml-2">{selectedAlert.alertTitle}</span>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedAlert(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Device</label>
                  <div className="font-medium">{selectedAlert.deviceId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Alert Date</label>
                  <div className="font-medium">{new Date(selectedAlert.alertDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Severity</label>
                  <Badge className={SEVERITY_COLORS[selectedAlert.severity as keyof typeof SEVERITY_COLORS]}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={STATUS_COLORS[selectedAlert.status as keyof typeof STATUS_COLORS]}>
                    {selectedAlert.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedAlert.alertDescription}
                </div>
              </div>

              {selectedAlert.assignedTo && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <div className="font-medium">{selectedAlert.assignedTo}</div>
                </div>
              )}

              {selectedAlert.status === 'Active' && (
                <div className="flex space-x-2 pt-4 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    onClick={() => handleStatusUpdate(selectedAlert, 'Acknowledged')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Acknowledge
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate(selectedAlert, 'Resolved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleStatusUpdate(selectedAlert, 'Dismissed')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}