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
import { Database, Server, Network, Laptop, HardDrive, Shield, Settings, Plus, Edit, Trash2, Eye, Clock, Link } from "lucide-react";
import { format } from "date-fns";
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
  const queryClient = useQueryClient();

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

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">CI Type</Label>
                    <p className="font-medium">{item.ciType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                    <p className="font-medium">{item.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Environment</Label>
                    <p className="font-medium">{item.environment}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Owner</Label>
                    <p className="font-medium">{item.owner || 'Not assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status & Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Lifecycle Status</Label>
                    <Badge variant="outline" className={LIFECYCLE_COLORS[item.lifecycleStatus as keyof typeof LIFECYCLE_COLORS]}>
                      {item.lifecycleStatus}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Risk Level</Label>
                    <Badge variant="outline" className={RISK_COLORS[item.riskLevel as keyof typeof RISK_COLORS]}>
                      {item.riskLevel}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Compliance</Label>
                    <Badge variant="outline" className={COMPLIANCE_COLORS[item.complianceStatus as keyof typeof COMPLIANCE_COLORS]}>
                      {item.complianceStatus}
                    </Badge>
                  </div>
                  <div>
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
                  <div className="grid grid-cols-2 gap-4">
                    {item.manufacturer && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Manufacturer</Label>
                        <p className="font-medium">{item.manufacturer}</p>
                      </div>
                    )}
                    {item.model && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                        <p className="font-medium">{item.model}</p>
                      </div>
                    )}
                    {item.serialNumber && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                        <p className="font-medium">{item.serialNumber}</p>
                      </div>
                    )}
                    {item.assetTag && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Asset Tag</Label>
                        <p className="font-medium">{item.assetTag}</p>
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
                  <div className="grid grid-cols-2 gap-4">
                    {item.operatingSystem && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Operating System</Label>
                        <p className="font-medium">{item.operatingSystem}</p>
                      </div>
                    )}
                    {item.osVersion && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">OS Version</Label>
                        <p className="font-medium">{item.osVersion}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
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
                        {format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <CardDescription>{record.changeDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Requested By</Label>
                        <p className="font-medium">{record.requestedBy || 'System'}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Implemented By</Label>
                        <p className="font-medium">{record.implementedBy || 'Pending'}</p>
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

        <TabsContent value="relationships" className="space-y-4">
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
                <Card>
                  <CardContent className="text-center py-8">
                    <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No relationships found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Compliance Information</h3>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Run Compliance Check
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Overall Compliance</span>
                </div>
                <Badge variant="outline" className={COMPLIANCE_COLORS[item.complianceStatus as keyof typeof COMPLIANCE_COLORS]}>
                  {item.complianceStatus}
                </Badge>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Risk Level</Label>
                  <Badge variant="outline" className={RISK_COLORS[item.riskLevel as keyof typeof RISK_COLORS]}>
                    {item.riskLevel}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Monitoring</Label>
                  <Badge variant="outline" className={item.monitoringEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {item.monitoringEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <ScrollArea className="h-[500px]">
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
    </div>
  );
}