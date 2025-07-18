import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const warrantySchema = z.object({
  serialNumber: z.string().optional(),
  assetTag: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyStartDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  warrantyType: z.string().optional(),
  warrantyProvider: z.string().optional(),
  cost: z.string().optional(),
  supplier: z.string().optional(),
  owner: z.string().optional(),
  department: z.string().optional(),
  endOfLifeDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
});

type WarrantyFormData = z.infer<typeof warrantySchema>;

interface WarrantyManagementDialogProps {
  device: {
    id: number;
    name: string;
    model: string;
    type: string;
    serialNumber?: string;
    assetTag?: string;
    manufacturer?: string;
    purchaseDate?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    warrantyType?: string;
    warrantyProvider?: string;
    cost?: string;
    supplier?: string;
    owner?: string;
    department?: string;
    endOfLifeDate?: string;
    nextMaintenanceDate?: string;
    lastMaintenanceDate?: string;
    warrantyAutoDetected?: boolean;
    warrantyLastChecked?: string;
  };
  trigger: React.ReactNode;
}

export function WarrantyManagementDialog({ device, trigger }: WarrantyManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<WarrantyFormData>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      serialNumber: device.serialNumber || "",
      assetTag: device.assetTag || "",
      manufacturer: device.manufacturer || "",
      purchaseDate: device.purchaseDate ? format(new Date(device.purchaseDate), "yyyy-MM-dd") : "",
      warrantyStartDate: device.warrantyStartDate ? format(new Date(device.warrantyStartDate), "yyyy-MM-dd") : "",
      warrantyEndDate: device.warrantyEndDate ? format(new Date(device.warrantyEndDate), "yyyy-MM-dd") : "",
      warrantyType: device.warrantyType || "",
      warrantyProvider: device.warrantyProvider || "",
      cost: device.cost || "",
      supplier: device.supplier || "",
      owner: device.owner || "",
      department: device.department || "",
      endOfLifeDate: device.endOfLifeDate ? format(new Date(device.endOfLifeDate), "yyyy-MM-dd") : "",
      nextMaintenanceDate: device.nextMaintenanceDate ? format(new Date(device.nextMaintenanceDate), "yyyy-MM-dd") : "",
      lastMaintenanceDate: device.lastMaintenanceDate ? format(new Date(device.lastMaintenanceDate), "yyyy-MM-dd") : "",
    },
  });

  const updateWarrantyMutation = useMutation({
    mutationFn: async (data: WarrantyFormData) => {
      const warrantyData = {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : undefined,
        warrantyEndDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : undefined,
        endOfLifeDate: data.endOfLifeDate ? new Date(data.endOfLifeDate) : undefined,
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : undefined,
        lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : undefined,
      };
      return apiRequest(`/api/devices/${device.id}/warranty`, {
        method: "PATCH",
        body: JSON.stringify(warrantyData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Warranty information updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update warranty information",
        variant: "destructive",
      });
    },
  });

  const autoDetectWarrantyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/devices/${device.id}/warranty/auto-detect`, {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      if (data.warrantyInfo.autoDetected) {
        toast({
          title: "Success",
          description: "Warranty information detected automatically",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        setOpen(false);
      } else {
        toast({
          title: "Info",
          description: "Could not auto-detect warranty information",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to auto-detect warranty information",
        variant: "destructive",
      });
    },
  });

  const handleAutoDetect = async () => {
    setIsAutoDetecting(true);
    try {
      await autoDetectWarrantyMutation.mutateAsync();
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const onSubmit = (data: WarrantyFormData) => {
    updateWarrantyMutation.mutate(data);
  };

  const getWarrantyStatus = () => {
    if (!device.warrantyEndDate) return { status: "unknown", color: "gray" };
    
    const warrantyEndDate = new Date(device.warrantyEndDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: "expired", color: "red" };
    if (daysUntilExpiry <= 30) return { status: "expiring", color: "orange" };
    if (daysUntilExpiry <= 90) return { status: "warning", color: "yellow" };
    return { status: "active", color: "green" };
  };

  const warrantyStatus = getWarrantyStatus();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Warranty Management - {device.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warranty Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Warranty Status
              </CardTitle>
              <CardDescription>Current warranty information and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={warrantyStatus.color === "green" ? "default" : "destructive"}>
                    {warrantyStatus.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Warranty End Date</Label>
                  <p className="text-sm">
                    {device.warrantyEndDate 
                      ? format(new Date(device.warrantyEndDate), "MMM dd, yyyy")
                      : "Not set"
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Auto-Detected</Label>
                  <div className="flex items-center gap-1">
                    {device.warrantyAutoDetected ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {device.warrantyAutoDetected ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Last Checked</Label>
                  <p className="text-sm">
                    {device.warrantyLastChecked 
                      ? format(new Date(device.warrantyLastChecked), "MMM dd, yyyy")
                      : "Never"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Detection Section */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Detection</CardTitle>
              <CardDescription>
                Automatically detect warranty information from manufacturer databases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleAutoDetect}
                disabled={isAutoDetecting || autoDetectWarrantyMutation.isPending}
                className="w-full"
              >
                {isAutoDetecting || autoDetectWarrantyMutation.isPending ? (
                  "Detecting..."
                ) : (
                  "Auto-Detect Warranty Information"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Manual Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
              <CardDescription>
                Manually enter or update warranty and asset information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      {...form.register("serialNumber")}
                      placeholder="Enter serial number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assetTag">Asset Tag</Label>
                    <Input
                      id="assetTag"
                      {...form.register("assetTag")}
                      placeholder="Enter asset tag"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Select 
                      value={form.watch("manufacturer")} 
                      onValueChange={(value) => form.setValue("manufacturer", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select manufacturer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dell">Dell</SelectItem>
                        <SelectItem value="HP">HP</SelectItem>
                        <SelectItem value="Lenovo">Lenovo</SelectItem>
                        <SelectItem value="Apple">Apple</SelectItem>
                        <SelectItem value="Microsoft">Microsoft</SelectItem>
                        <SelectItem value="ASUS">ASUS</SelectItem>
                        <SelectItem value="Acer">Acer</SelectItem>
                        <SelectItem value="Samsung">Samsung</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      {...form.register("purchaseDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warrantyStartDate">Warranty Start Date</Label>
                    <Input
                      id="warrantyStartDate"
                      type="date"
                      {...form.register("warrantyStartDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warrantyEndDate">Warranty End Date</Label>
                    <Input
                      id="warrantyEndDate"
                      type="date"
                      {...form.register("warrantyEndDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warrantyType">Warranty Type</Label>
                    <Select 
                      value={form.watch("warrantyType")} 
                      onValueChange={(value) => form.setValue("warrantyType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warranty type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Extended">Extended</SelectItem>
                        <SelectItem value="On-Site">On-Site</SelectItem>
                        <SelectItem value="Next Business Day">Next Business Day</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warrantyProvider">Warranty Provider</Label>
                    <Select 
                      value={form.watch("warrantyProvider")} 
                      onValueChange={(value) => form.setValue("warrantyProvider", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                        <SelectItem value="Third Party">Third Party</SelectItem>
                        <SelectItem value="Internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      {...form.register("cost")}
                      placeholder="Enter cost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      {...form.register("supplier")}
                      placeholder="Enter supplier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner">Owner</Label>
                    <Input
                      id="owner"
                      {...form.register("owner")}
                      placeholder="Enter owner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      {...form.register("department")}
                      placeholder="Enter department"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endOfLifeDate">End of Life Date</Label>
                    <Input
                      id="endOfLifeDate"
                      type="date"
                      {...form.register("endOfLifeDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextMaintenanceDate">Next Maintenance Date</Label>
                    <Input
                      id="nextMaintenanceDate"
                      type="date"
                      {...form.register("nextMaintenanceDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastMaintenanceDate">Last Maintenance Date</Label>
                    <Input
                      id="lastMaintenanceDate"
                      type="date"
                      {...form.register("lastMaintenanceDate")}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateWarrantyMutation.isPending}
                  >
                    {updateWarrantyMutation.isPending ? "Updating..." : "Update Warranty"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}