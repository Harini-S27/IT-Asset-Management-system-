import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Plus, AlertTriangle, Clock, Settings, Trash2, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, addDays, isBefore } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Form schema for asset lifecycle
const assetLifecycleSchema = z.object({
  deviceId: z.number().min(1, "Please select a device"),
  deviceName: z.string().min(1, "Device name is required"),
  acquiredDate: z.string().min(1, "Acquired date is required").refine((date) => {
    return !isNaN(Date.parse(date));
  }, "Invalid date format"),
  retirementDate: z.string().min(1, "Retirement date is required").refine((date) => {
    return !isNaN(Date.parse(date));
  }, "Invalid date format"),
  notificationDays: z.number().min(1, "Notification days must be at least 1").max(365, "Max 365 days"),
  dailyNotifications: z.boolean(),
  notes: z.string().optional()
}).refine((data) => {
  const acquired = new Date(data.acquiredDate);
  const retirement = new Date(data.retirementDate);
  return retirement > acquired;
}, {
  message: "Retirement date must be after acquisition date",
  path: ["retirementDate"]
});

type AssetLifecycleForm = z.infer<typeof assetLifecycleSchema>;

interface AssetLifecycle {
  id: number;
  deviceId: number;
  deviceName: string;
  acquiredDate: string;
  retirementDate: string;
  notificationDays: number;
  dailyNotifications: boolean;
  lastNotificationDate: string | null;
  isRetired: boolean;
  retiredDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Device {
  id: number;
  name: string;
  model: string;
  type: string;
  status: string;
}

export default function AssetLifecyclePage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetLifecycle | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: assets = [], isLoading: assetsLoading } = useQuery<AssetLifecycle[]>({
    queryKey: ["/api/asset-lifecycle"],
    refetchInterval: 30000
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"]
  });

  const { data: nearRetirement = [] } = useQuery<AssetLifecycle[]>({
    queryKey: ["/api/asset-lifecycle/near-retirement/30"],
    refetchInterval: 60000
  });

  // Form setup
  const form = useForm<AssetLifecycleForm>({
    resolver: zodResolver(assetLifecycleSchema),
    defaultValues: {
      deviceId: 0,
      deviceName: "",
      acquiredDate: format(new Date(), "yyyy-MM-dd"),
      retirementDate: format(addDays(new Date(), 365 * 3), "yyyy-MM-dd"), // Default 3 years
      notificationDays: 30,
      dailyNotifications: false,
      notes: ""
    }
  });

  // Mutations
  const createAssetMutation = useMutation({
    mutationFn: async (data: AssetLifecycleForm) => {
      const response = await fetch("/api/asset-lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle/near-retirement/30"] });
      setShowAddDialog(false);
      setSelectedDevice(null);
      form.reset();
      toast({ title: "Asset lifecycle created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating asset lifecycle", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AssetLifecycleForm> }) => {
      const response = await fetch(`/api/asset-lifecycle/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle/near-retirement/30"] });
      setEditingAsset(null);
      form.reset();
      toast({ title: "Asset lifecycle updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating asset lifecycle", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/asset-lifecycle/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle/near-retirement/30"] });
      toast({ title: "Asset lifecycle deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting asset lifecycle", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const retireAssetMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const response = await fetch(`/api/asset-lifecycle/${id}/retire`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-lifecycle/near-retirement/30"] });
      toast({ title: "Asset retired successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error retiring asset", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Helper functions
  const calculateDaysUntilRetirement = (retirementDate: string): number => {
    return differenceInDays(new Date(retirementDate), new Date());
  };

  const getRetirementStatus = (asset: AssetLifecycle) => {
    if (asset.isRetired) return { status: "retired", color: "bg-gray-500", text: "Retired" };
    
    const daysUntil = calculateDaysUntilRetirement(asset.retirementDate);
    
    if (daysUntil < 0) return { status: "overdue", color: "bg-red-500", text: "Overdue" };
    if (daysUntil <= 7) return { status: "critical", color: "bg-red-500", text: `${daysUntil} days` };
    if (daysUntil <= 30) return { status: "warning", color: "bg-yellow-500", text: `${daysUntil} days` };
    if (daysUntil <= 90) return { status: "upcoming", color: "bg-blue-500", text: `${daysUntil} days` };
    return { status: "normal", color: "bg-green-500", text: `${daysUntil} days` };
  };

  const shouldShowNotification = (asset: AssetLifecycle): boolean => {
    if (asset.isRetired) return false;
    
    const daysUntil = calculateDaysUntilRetirement(asset.retirementDate);
    return daysUntil <= asset.notificationDays;
  };

  const getNextNotificationDate = (asset: AssetLifecycle): string => {
    if (!shouldShowNotification(asset)) return "N/A";
    
    if (asset.dailyNotifications) {
      return "Daily until retirement";
    }
    
    const retirementDate = new Date(asset.retirementDate);
    const notificationStartDate = addDays(retirementDate, -asset.notificationDays);
    
    if (isBefore(new Date(), notificationStartDate)) {
      return format(notificationStartDate, "MMM dd, yyyy");
    }
    
    return "Active";
  };

  // Form handlers
  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find((d) => d.id === parseInt(deviceId));
    if (device) {
      setSelectedDevice(device);
      form.setValue("deviceId", device.id);
      form.setValue("deviceName", device.name);
    }
  };

  const handleSubmit = (data: AssetLifecycleForm) => {
    // Ensure device is selected
    if (!data.deviceId || data.deviceId === 0) {
      toast({
        title: "Please select a device",
        variant: "destructive"
      });
      return;
    }

    if (editingAsset) {
      updateAssetMutation.mutate({ id: editingAsset.id, data });
    } else {
      createAssetMutation.mutate(data);
    }
  };

  const handleEdit = (asset: AssetLifecycle) => {
    setEditingAsset(asset);
    form.reset({
      deviceId: asset.deviceId,
      deviceName: asset.deviceName,
      acquiredDate: asset.acquiredDate.split('T')[0],
      retirementDate: asset.retirementDate.split('T')[0],
      notificationDays: asset.notificationDays,
      dailyNotifications: asset.dailyNotifications,
      notes: asset.notes || ""
    });
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingAsset(null);
    setSelectedDevice(null);
    form.reset();
  };

  // Available devices (not already in lifecycle management)
  const availableDevices = devices.filter((device) => 
    !assets.some((asset) => asset.deviceId === device.id && !asset.isRetired)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Lifecycle Management</h1>
          <p className="text-muted-foreground">
            Track device acquisition, retirement dates, and manage lifecycle notifications
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? "Edit Asset Lifecycle" : "Add Asset Lifecycle"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {!editingAsset && (
                <div className="space-y-2">
                  <Label htmlFor="device">Select Device</Label>
                  <Select onValueChange={handleDeviceSelect} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a device..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDevices.length === 0 ? (
                        <SelectItem value="no-devices" disabled>
                          No available devices
                        </SelectItem>
                      ) : (
                        availableDevices.map((device) => (
                          <SelectItem key={device.id} value={device.id.toString()}>
                            {device.name} ({device.type})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(selectedDevice || editingAsset) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="acquiredDate">Acquired Date</Label>
                    <Input
                      type="date"
                      {...form.register("acquiredDate")}
                      required
                    />
                    {form.formState.errors.acquiredDate && (
                      <p className="text-sm text-red-500">{form.formState.errors.acquiredDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retirementDate">Retirement Date</Label>
                    <Input
                      type="date"
                      {...form.register("retirementDate")}
                      required
                    />
                    {form.formState.errors.retirementDate && (
                      <p className="text-sm text-red-500">{form.formState.errors.retirementDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notificationDays">Notification Days Before Retirement</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      {...form.register("notificationDays", { valueAsNumber: true })}
                      placeholder="30"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="dailyNotifications"
                      {...form.register("dailyNotifications")}
                    />
                    <Label htmlFor="dailyNotifications">Daily Notifications</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      {...form.register("notes")}
                      placeholder="Additional notes about this asset..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                    >
                      {editingAsset ? "Update" : "Create"} Asset
                    </Button>
                  </div>
                </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notifications Section */}
      {nearRetirement.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{nearRetirement.length}</strong> asset(s) are approaching retirement and may need attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{assets.length}</p>
              <p className="text-sm text-muted-foreground">Total Assets</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{nearRetirement.length}</p>
              <p className="text-sm text-muted-foreground">Near Retirement</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {assets.filter((a) => calculateDaysUntilRetirement(a.retirementDate) < 0 && !a.isRetired).length}
              </p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Settings className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {assets.filter((a) => a.isRetired).length}
              </p>
              <p className="text-sm text-muted-foreground">Retired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Lifecycle Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="text-center py-8">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assets in lifecycle management. Add your first asset to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Acquired Date</TableHead>
                  <TableHead>Retirement Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Notification</TableHead>
                  <TableHead>Notification Settings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const status = getRetirementStatus(asset);
                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">
                        {asset.deviceName}
                      </TableCell>
                      <TableCell>
                        {format(new Date(asset.acquiredDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(asset.retirementDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} text-white`}>
                          {status.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getNextNotificationDate(asset)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{asset.notificationDays} days before</div>
                          {asset.dailyNotifications && (
                            <div className="text-muted-foreground">Daily alerts</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(asset)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!asset.isRetired && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retireAssetMutation.mutate({ id: asset.id, notes: "Manually retired" })}
                            >
                              Retire
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAssetMutation.mutate(asset.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}