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
import { Database, Server, Network, Laptop, HardDrive, Shield, Settings, Plus, Edit, Trash2, Eye, Clock, Link } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Device, CmdbConfigurationItem, CmdbChangeRecord, CmdbRelationship } from "@shared/schema";

interface CmdbPageProps {}

const RISK_COLORS = {
  Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  Critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const LIFECYCLE_COLORS = {
  Planning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Retiring: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  Retired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

const COMPLIANCE_COLORS = {
  Compliant: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Non-Compliant": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  Unknown: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

export default function CmdbPage({}: CmdbPageProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedConfigurationItem, setSelectedConfigurationItem] = useState<CmdbConfigurationItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    ciName: '',
    ciDescription: '',
    ciType: 'Hardware',
    category: 'Computer',
    environment: 'Production',
    lifecycleStatus: 'Active',
    riskLevel: 'Low',
    complianceStatus: 'Unknown',
    owner: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    assetTag: '',
    operatingSystem: '',
    osVersion: '',
    monitoringEnabled: false
  });
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

  // Fetch all configuration items
  const { data: configurationItems = [], isLoading: configItemsLoading } = useQuery({
    queryKey: ['/api/cmdb/configuration-items'],
    queryFn: async () => {
      const response = await fetch('/api/cmdb/configuration-items');
      if (!response.ok) throw new Error('Failed to fetch configuration items');
      return response.json() as Promise<CmdbConfigurationItem[]>;
    }
  });

  // Fetch configuration items for selected device
  const { data: deviceConfigItems = [] } = useQuery({
    queryKey: ['/api/cmdb/configuration-items/device', selectedDevice?.id],
    queryFn: async () => {
      if (!selectedDevice?.id) return [];
      const response = await fetch(`/api/cmdb/configuration-items/device/${selectedDevice.id}`);
      if (!response.ok) throw new Error('Failed to fetch device configuration items');
      return response.json() as Promise<CmdbConfigurationItem[]>;
    },
    enabled: !!selectedDevice?.id
  });

  // Fetch change records for selected configuration item
  const { data: changeRecords = [] } = useQuery({
    queryKey: ['/api/cmdb/change-records/configuration-item', selectedConfigurationItem?.id],
    queryFn: async () => {
      if (!selectedConfigurationItem?.id) return [];
      const response = await fetch(`/api/cmdb/change-records/configuration-item/${selectedConfigurationItem.id}`);
      if (!response.ok) throw new Error('Failed to fetch change records');
      return response.json() as Promise<CmdbChangeRecord[]>;
    },
    enabled: !!selectedConfigurationItem?.id
  });

  // Fetch relationships for selected configuration item
  const { data: relationships = [] } = useQuery({
    queryKey: ['/api/cmdb/relationships/configuration-item', selectedConfigurationItem?.id],
    queryFn: async () => {
      if (!selectedConfigurationItem?.id) return [];
      const response = await fetch(`/api/cmdb/relationships/configuration-item/${selectedConfigurationItem.id}`);
      if (!response.ok) throw new Error('Failed to fetch relationships');
      return response.json() as Promise<CmdbRelationship[]>;
    },
    enabled: !!selectedConfigurationItem?.id
  });

  // Create configuration item mutation
  const createConfigurationItem = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/cmdb/configuration-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create configuration item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cmdb/configuration-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cmdb/configuration-items/device', selectedDevice?.id] });
      toast({
        title: "Success",
        description: "Configuration item created successfully",
      });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create configuration item",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      ciName: '',
      ciDescription: '',
      ciType: 'Hardware',
      category: 'Computer',
      environment: 'Production',
      lifecycleStatus: 'Active',
      riskLevel: 'Low',
      complianceStatus: 'Unknown',
      owner: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      assetTag: '',
      operatingSystem: '',
      osVersion: '',
      monitoringEnabled: false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) {
      toast({
        title: "Error",
        description: "Please select a device first",
        variant: "destructive",
      });
      return;
    }

    createConfigurationItem.mutate({
      ...formData,
      deviceId: selectedDevice.id
    });
  };

  // Get approved devices (devices that are not in pending state)
  const approvedDevices = devices.filter(device => device.status !== 'Pending');

  // Get CI icon based on type
  const getCiIcon = (ciType: string) => {
    switch (ciType) {
      case 'Hardware': return <HardDrive className="h-4 w-4" />;
      case 'Software': return <Settings className="h-4 w-4" />;
      case 'Network': return <Network className="h-4 w-4" />;
      case 'Service': return <Server className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const ConfigurationItemCard = ({ item }: { item: CmdbConfigurationItem }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedConfigurationItem(item)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCiIcon(item.ciType)}
            <CardTitle className="text-lg">{item.ciName}</CardTitle>
          </div>
          <Badge variant="outline" className={RISK_COLORS[item.riskLevel as keyof typeof RISK_COLORS]}>
            {item.riskLevel}
          </Badge>
        </div>
        <CardDescription>{item.ciDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Type</Label>
            <p className="font-medium">{item.ciType}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Environment</Label>
            <p className="font-medium">{item.environment}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Badge variant="outline" className={LIFECYCLE_COLORS[item.lifecycleStatus as keyof typeof LIFECYCLE_COLORS]}>
              {item.lifecycleStatus}
            </Badge>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Compliance</Label>
            <Badge variant="outline" className={COMPLIANCE_COLORS[item.complianceStatus as keyof typeof COMPLIANCE_COLORS]}>
              {item.complianceStatus}
            </Badge>
          </div>
          {item.manufacturer && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Manufacturer</Label>
              <p className="font-medium">{item.manufacturer}</p>
            </div>
          )}
          {item.model && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Model</Label>
              <p className="font-medium">{item.model}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const ConfigurationItemDetails = ({ item }: { item: CmdbConfigurationItem }) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getCiIcon(item.ciType)}
          <div>
            <h2 className="text-2xl font-bold">{item.ciName}</h2>
            <p className="text-muted-foreground">{item.ciDescription}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full space-y-6">
        <div className="border-b bg-background sticky top-0 z-10">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/30">
            <TabsTrigger value="details" className="text-sm font-medium data-[state=active]:bg-background">Details</TabsTrigger>
            <TabsTrigger value="changes" className="text-sm font-medium data-[state=active]:bg-background">Changes</TabsTrigger>
            <TabsTrigger value="relationships" className="text-sm font-medium data-[state=active]:bg-background">Relationships</TabsTrigger>
            <TabsTrigger value="compliance" className="text-sm font-medium data-[state=active]:bg-background">Compliance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">CI Type</Label>
                    <p className="font-medium text-sm break-words">{item.ciType}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                    <p className="font-medium text-sm break-words">{item.category}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Environment</Label>
                    <p className="font-medium text-sm break-words">{item.environment}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Owner</Label>
                    <p className="font-medium text-sm break-words">{item.owner || 'Not assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status & Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Lifecycle Status</Label>
                    <Badge variant="outline" className={LIFECYCLE_COLORS[item.lifecycleStatus as keyof typeof LIFECYCLE_COLORS]}>
                      {item.lifecycleStatus}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Risk Level</Label>
                    <Badge variant="outline" className={RISK_COLORS[item.riskLevel as keyof typeof RISK_COLORS]}>
                      {item.riskLevel}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Compliance</Label>
                    <Badge variant="outline" className={COMPLIANCE_COLORS[item.complianceStatus as keyof typeof COMPLIANCE_COLORS]}>
                      {item.complianceStatus}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Monitoring</Label>
                    <Badge variant="outline" className={item.monitoringEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {item.monitoringEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(item.manufacturer || item.model || item.serialNumber) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hardware Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {item.manufacturer && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Manufacturer</Label>
                        <p className="font-medium text-sm break-words">{item.manufacturer}</p>
                      </div>
                    )}
                    {item.model && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                        <p className="font-medium text-sm break-words">{item.model}</p>
                      </div>
                    )}
                    {item.serialNumber && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                        <p className="font-medium text-sm break-words">{item.serialNumber}</p>
                      </div>
                    )}
                    {item.assetTag && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Asset Tag</Label>
                        <p className="font-medium text-sm break-words">{item.assetTag}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {(item.operatingSystem || item.osVersion) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Software Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {item.operatingSystem && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Operating System</Label>
                        <p className="font-medium text-sm break-words">{item.operatingSystem}</p>
                      </div>
                    )}
                    {item.osVersion && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">OS Version</Label>
                        <p className="font-medium text-sm break-words">{item.osVersion}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Change History</h3>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Change
            </Button>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {changeRecords.map((record) => (
                <Card key={record.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <CardTitle className="text-base">{record.changeType}</CardTitle>
                        <Badge variant="outline" className={
                          record.implementationStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                          record.implementationStatus === 'Failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {record.implementationStatus}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {record.createdAt ? format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}
                      </span>
                    </div>
                    <CardDescription>{record.changeDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Requested By</Label>
                        <p className="font-medium break-words">{record.requestedBy || 'System'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Implemented By</Label>
                        <p className="font-medium break-words">{record.implementedBy || 'Pending'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {changeRecords.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No change records found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">CI Relationships</h3>
            <Button variant="outline" size="sm">
              <Link className="h-4 w-4 mr-2" />
              Add Relationship
            </Button>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {relationships.map((relationship) => (
                <Card key={relationship.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        <CardTitle className="text-base">{relationship.relationshipType}</CardTitle>
                        <Badge variant="outline" className={
                          relationship.strength === 'Critical' ? 'bg-red-100 text-red-800' :
                          relationship.strength === 'Strong' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {relationship.strength}
                        </Badge>
                      </div>
                      <Badge variant="outline">
                        {relationship.direction}
                      </Badge>
                    </div>
                    {relationship.relationshipDescription && (
                      <CardDescription>{relationship.relationshipDescription}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
              {relationships.length === 0 && (
                <div className="text-center py-12">
                  <Link className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No relationships found</h3>
                  <p className="text-sm text-muted-foreground">This configuration item has no defined relationships with other items.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Compliance Information</h3>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Run Compliance Check
            </Button>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Current Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-1">
                    <span className="font-medium text-base">Overall Compliance</span>
                    <p className="text-sm text-muted-foreground">Current compliance status for this configuration item</p>
                  </div>
                  <Badge variant="outline" className={`${COMPLIANCE_COLORS[item.complianceStatus as keyof typeof COMPLIANCE_COLORS]} text-sm px-4 py-2 font-medium`}>
                    {item.complianceStatus}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 min-w-0 pr-4">
                        <Label className="text-sm font-medium break-words">Risk Assessment</Label>
                        <p className="text-xs text-muted-foreground break-words">Current risk level for this configuration item</p>
                      </div>
                      <Badge variant="outline" className={`${RISK_COLORS[item.riskLevel as keyof typeof RISK_COLORS]} text-sm px-3 py-1 whitespace-nowrap`}>
                        {item.riskLevel}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 min-w-0 pr-4">
                        <Label className="text-sm font-medium break-words">Monitoring Status</Label>
                        <p className="text-xs text-muted-foreground break-words">Real-time monitoring configuration</p>
                      </div>
                      <Badge variant="outline" className={`${item.monitoringEnabled ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"} text-sm px-3 py-1 whitespace-nowrap`}>
                        {item.monitoringEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compliance Rules</CardTitle>
                <CardDescription>Configuration compliance requirements and policies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No compliance rules defined</h3>
                  <p className="text-sm text-muted-foreground mb-4">Define compliance rules to automatically monitor this configuration item.</p>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Define Compliance Rules
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (devicesLoading || configItemsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading CMDB data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuration Management Database</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage detailed configuration information for all approved devices
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration Item
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device List */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Devices</CardTitle>
            <CardDescription>
              {approvedDevices.length} devices available for configuration management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {approvedDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDevice?.id === device.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedDevice(device)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        {device.type === 'Server' && <Server className="h-4 w-4" />}
                        {device.type === 'Workstation' && <Laptop className="h-4 w-4" />}
                        {device.type === 'Network' && <Network className="h-4 w-4" />}
                        {!['Server', 'Workstation', 'Network'].includes(device.type) && <HardDrive className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{device.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {device.type} • {device.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Configuration Items for Selected Device */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Items</CardTitle>
            <CardDescription>
              {selectedDevice 
                ? `${deviceConfigItems.length} configuration items for ${selectedDevice.name}`
                : 'Select a device to view its configuration items'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDevice ? (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {deviceConfigItems.map((item) => (
                    <ConfigurationItemCard key={item.id} item={item} />
                  ))}
                  {deviceConfigItems.length === 0 && (
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No configuration items found</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setShowAddDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Configuration Item
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a device to view configuration items</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Item Details */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Details</CardTitle>
            <CardDescription>
              {selectedConfigurationItem 
                ? `Details for ${selectedConfigurationItem.ciName}`
                : 'Select a configuration item to view details'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedConfigurationItem ? (
              <ScrollArea className="h-[600px] pr-4">
                <ConfigurationItemDetails item={selectedConfigurationItem} />
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a configuration item to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total CIs</p>
                <p className="text-2xl font-bold">{configurationItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Compliant</p>
                <p className="text-2xl font-bold">
                  {configurationItems.filter(item => item.complianceStatus === 'Compliant').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">
                  {configurationItems.filter(item => item.lifecycleStatus === 'Active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Monitored</p>
                <p className="text-2xl font-bold">
                  {configurationItems.filter(item => item.monitoringEnabled).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Configuration Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Configuration Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ciName">Configuration Item Name*</Label>
                <Input
                  id="ciName"
                  value={formData.ciName}
                  onChange={(e) => setFormData({...formData, ciName: e.target.value})}
                  placeholder="e.g., Dell OptiPlex 7090"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ciType">CI Type*</Label>
                <Select value={formData.ciType} onValueChange={(value) => setFormData({...formData, ciType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Network">Network</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Database">Database</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="ciDescription">Description</Label>
              <Textarea
                id="ciDescription"
                value={formData.ciDescription}
                onChange={(e) => setFormData({...formData, ciDescription: e.target.value})}
                placeholder="Describe the configuration item..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer">Computer</SelectItem>
                    <SelectItem value="Server">Server</SelectItem>
                    <SelectItem value="Network Device">Network Device</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="Peripheral">Peripheral</SelectItem>
                    <SelectItem value="Software License">Software License</SelectItem>
                    <SelectItem value="Application">Application</SelectItem>
                    <SelectItem value="Operating System">Operating System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="environment">Environment</Label>
                <Select value={formData.environment} onValueChange={(value) => setFormData({...formData, environment: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Staging">Staging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="lifecycleStatus">Lifecycle Status</Label>
                <Select value={formData.lifecycleStatus} onValueChange={(value) => setFormData({...formData, lifecycleStatus: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Retiring">Retiring</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select value={formData.riskLevel} onValueChange={(value) => setFormData({...formData, riskLevel: value})}>
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
                <Label htmlFor="complianceStatus">Compliance Status</Label>
                <Select value={formData.complianceStatus} onValueChange={(value) => setFormData({...formData, complianceStatus: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compliant">Compliant</SelectItem>
                    <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  placeholder="e.g., IT Department"
                />
              </div>
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  placeholder="e.g., Dell, HP, Lenovo"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="e.g., OptiPlex 7090"
                />
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                  placeholder="e.g., ABC123456"
                />
              </div>
              <div>
                <Label htmlFor="assetTag">Asset Tag</Label>
                <Input
                  id="assetTag"
                  value={formData.assetTag}
                  onChange={(e) => setFormData({...formData, assetTag: e.target.value})}
                  placeholder="e.g., ASSET001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="operatingSystem">Operating System</Label>
                <Input
                  id="operatingSystem"
                  value={formData.operatingSystem}
                  onChange={(e) => setFormData({...formData, operatingSystem: e.target.value})}
                  placeholder="e.g., Windows 11, Ubuntu 22.04"
                />
              </div>
              <div>
                <Label htmlFor="osVersion">OS Version</Label>
                <Input
                  id="osVersion"
                  value={formData.osVersion}
                  onChange={(e) => setFormData({...formData, osVersion: e.target.value})}
                  placeholder="e.g., 22H2, 22.04.3"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="monitoringEnabled"
                checked={formData.monitoringEnabled}
                onCheckedChange={(checked) => setFormData({...formData, monitoringEnabled: checked})}
              />
              <Label htmlFor="monitoringEnabled">Enable Monitoring</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createConfigurationItem.isPending}>
                {createConfigurationItem.isPending ? 'Creating...' : 'Create Configuration Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}