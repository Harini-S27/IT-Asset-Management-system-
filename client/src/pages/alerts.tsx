import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  AlertTriangle, 
  AlertCircle, 
  Shield, 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle,
  XCircle,
  Bell,
  Settings,
  Eye,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Device, Alert, AlertHistory } from "@shared/schema";

interface AlertsPageProps {}

const SEVERITY_COLORS = {
  Low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  Critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Acknowledged: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  Dismissed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const ALERT_TYPE_ICONS = {
  warranty_expiration: <Shield className="h-4 w-4" />,
  end_of_life: <Clock className="h-4 w-4" />,
  compliance_violation: <AlertTriangle className="h-4 w-4" />,
  security_risk: <Shield className="h-4 w-4" />,
  maintenance_due: <Settings className="h-4 w-4" />
};

export default function AlertsPage({}: AlertsPageProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    deviceId: '',
    alertType: 'warranty_expiration',
    alertTitle: '',
    alertDescription: '',
    severity: 'Medium',
    alertDate: new Date(),
    expirationDate: null as Date | null,
    warrantyExpirationDate: null as Date | null,
    endOfLifeDate: null as Date | null,
    maintenanceDueDate: null as Date | null,
    assignedTo: '',
    isRecurring: false,
    recurringInterval: 30,
    tags: [] as string[]
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarField, setCalendarField] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch devices
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['/api/devices'],
    queryFn: async () => {
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      return response.json() as Promise<Device[]>;
    }
  });

  // Fetch alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json() as Promise<Alert[]>;
    }
  });

  // Fetch alert history for selected alert
  const { data: alertHistory = [] } = useQuery({
    queryKey: ['/api/alerts/history', selectedAlert?.id],
    queryFn: async () => {
      if (!selectedAlert?.id) return [];
      const response = await fetch(`/api/alerts/${selectedAlert.id}/history`);
      if (!response.ok) throw new Error('Failed to fetch alert history');
      return response.json() as Promise<AlertHistory[]>;
    },
    enabled: !!selectedAlert?.id
  });

  // Create alert mutation
  const createAlert = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: "Success",
        description: "Alert created successfully",
      });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
    }
  });

  // Update alert status mutations
  const updateAlertStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/alerts/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
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
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update alert status",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      deviceId: '',
      alertType: 'warranty_expiration',
      alertTitle: '',
      alertDescription: '',
      severity: 'Medium',
      alertDate: new Date(),
      expirationDate: null,
      warrantyExpirationDate: null,
      endOfLifeDate: null,
      maintenanceDueDate: null,
      assignedTo: '',
      isRecurring: false,
      recurringInterval: 30,
      tags: []
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deviceId) {
      toast({
        title: "Error",
        description: "Please select a device",
        variant: "destructive",
      });
      return;
    }

    createAlert.mutate(formData);
  };

  const handleStatusUpdate = (alert: Alert, newStatus: string) => {
    updateAlertStatus.mutate({
      id: alert.id,
      status: newStatus
    });
  };

  const handleDateSelect = (date: Date | undefined, field: string) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [field]: date
      }));
    }
    setShowCalendar(false);
    setCalendarField('');
  };

  const openCalendar = (field: string) => {
    setCalendarField(field);
    setShowCalendar(true);
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterType !== 'all' && alert.alertType !== filterType) return false;
    return true;
  });

  // Get alert statistics
  const alertStats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'Active').length,
    critical: alerts.filter(a => a.severity === 'Critical').length,
    warranty: alerts.filter(a => a.alertType === 'warranty_expiration').length,
    endOfLife: alerts.filter(a => a.alertType === 'end_of_life').length
  };

  const AlertCard = ({ alert }: { alert: Alert }) => {
    const device = devices.find(d => d.id === alert.deviceId);
    
    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          selectedAlert?.id === alert.id ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => setSelectedAlert(alert)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ALERT_TYPE_ICONS[alert.alertType as keyof typeof ALERT_TYPE_ICONS]}
              <CardTitle className="text-lg">{alert.alertTitle}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS]}>
                {alert.severity}
              </Badge>
              <Badge variant="outline" className={STATUS_COLORS[alert.status as keyof typeof STATUS_COLORS]}>
                {alert.status}
              </Badge>
            </div>
          </div>
          <CardDescription>{alert.alertDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Device</Label>
              <p className="font-medium">{device?.name || 'Unknown Device'}</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Alert Date</Label>
              <p className="font-medium">{format(new Date(alert.alertDate), 'MMM dd, yyyy')}</p>
            </div>
            {alert.expirationDate && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Expiration Date</Label>
                <p className="font-medium">{format(new Date(alert.expirationDate), 'MMM dd, yyyy')}</p>
              </div>
            )}
            {alert.assignedTo && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Assigned To</Label>
                <p className="font-medium">{alert.assignedTo}</p>
              </div>
            )}
          </div>
          
          {alert.status === 'Active' && (
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(alert, 'Acknowledged');
                }}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Acknowledge
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(alert, 'Resolved');
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (devicesLoading || alertsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading alerts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Alert Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor warranty expiration, end-of-life, and compliance alerts
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Alerts</p>
                <p className="text-2xl font-bold">{alertStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">{alertStats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Critical</p>
                <p className="text-2xl font-bold">{alertStats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Warranty</p>
                <p className="text-2xl font-bold">{alertStats.warranty}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">End of Life</p>
                <p className="text-2xl font-bold">{alertStats.endOfLife}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Label>Filters:</Label>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
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
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alert Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="warranty_expiration">Warranty Expiration</SelectItem>
            <SelectItem value="end_of_life">End of Life</SelectItem>
            <SelectItem value="compliance_violation">Compliance Violation</SelectItem>
            <SelectItem value="security_risk">Security Risk</SelectItem>
            <SelectItem value="maintenance_due">Maintenance Due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Alerts ({filteredAlerts.length})</CardTitle>
              <CardDescription>
                Active alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                  {filteredAlerts.length === 0 && (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No alerts found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Alert Details */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Details</CardTitle>
            <CardDescription>
              {selectedAlert ? `Details for ${selectedAlert.alertTitle}` : 'Select an alert to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedAlert ? (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Alert Type</Label>
                    <p className="font-medium">{selectedAlert.alertType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="font-medium">{selectedAlert.alertDescription}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Severity</Label>
                    <Badge variant="outline" className={SEVERITY_COLORS[selectedAlert.severity as keyof typeof SEVERITY_COLORS]}>
                      {selectedAlert.severity}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant="outline" className={STATUS_COLORS[selectedAlert.status as keyof typeof STATUS_COLORS]}>
                      {selectedAlert.status}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Action History</Label>
                    <div className="mt-2 space-y-2">
                      {alertHistory.map((history) => (
                        <div key={history.id} className="border rounded p-2 text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{history.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(history.actionDate), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-muted-foreground">by {history.actionBy}</p>
                          {history.notes && <p className="mt-1">{history.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select an alert to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Alert Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Alert</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deviceId">Device*</Label>
                <Select value={formData.deviceId} onValueChange={(value) => setFormData({...formData, deviceId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.name} ({device.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="alertType">Alert Type*</Label>
                <Select value={formData.alertType} onValueChange={(value) => setFormData({...formData, alertType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warranty_expiration">Warranty Expiration</SelectItem>
                    <SelectItem value="end_of_life">End of Life</SelectItem>
                    <SelectItem value="compliance_violation">Compliance Violation</SelectItem>
                    <SelectItem value="security_risk">Security Risk</SelectItem>
                    <SelectItem value="maintenance_due">Maintenance Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="alertTitle">Alert Title*</Label>
              <Input
                id="alertTitle"
                value={formData.alertTitle}
                onChange={(e) => setFormData({...formData, alertTitle: e.target.value})}
                placeholder="e.g., Warranty expires in 30 days"
                required
              />
            </div>

            <div>
              <Label htmlFor="alertDescription">Description</Label>
              <Textarea
                id="alertDescription"
                value={formData.alertDescription}
                onChange={(e) => setFormData({...formData, alertDescription: e.target.value})}
                placeholder="Describe the alert details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="severity">Severity*</Label>
                <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                  placeholder="e.g., IT Team"
                />
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warranty Expiration Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.warrantyExpirationDate 
                        ? format(formData.warrantyExpirationDate, 'PPP')
                        : 'Select date'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.warrantyExpirationDate || undefined}
                      onSelect={(date) => handleDateSelect(date, 'warrantyExpirationDate')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>End of Life Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endOfLifeDate 
                        ? format(formData.endOfLifeDate, 'PPP')
                        : 'Select date'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.endOfLifeDate || undefined}
                      onSelect={(date) => handleDateSelect(date, 'endOfLifeDate')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => setFormData({...formData, isRecurring: checked})}
              />
              <Label htmlFor="isRecurring">Recurring Alert</Label>
            </div>

            {formData.isRecurring && (
              <div>
                <Label htmlFor="recurringInterval">Recurring Interval (days)</Label>
                <Input
                  id="recurringInterval"
                  type="number"
                  value={formData.recurringInterval}
                  onChange={(e) => setFormData({...formData, recurringInterval: parseInt(e.target.value)})}
                  min="1"
                  max="365"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAlert.isPending}>
                {createAlert.isPending ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}