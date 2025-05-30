import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Router, 
  Settings, 
  Wifi, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';

interface RouterConfig {
  router_ip: string;
  ssh_username: string;
  ssh_password: string;
  mode: string;
  router_type: string;
  last_status: string;
  last_tested: string | null;
}

interface RouterStatus {
  status: string;
  message: string;
  last_tested: string | null;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  connection_info: {
    tested_at: string;
    router_ip: string;
    response_time?: number;
    router_info?: {
      system_info: string;
      router_type: string;
      capabilities: Record<string, boolean>;
    };
  };
  tested_at: string;
}

export default function RouterSetup() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    router_ip: '',
    ssh_username: '',
    ssh_password: '',
    mode: 'simulated',
    router_type: 'generic'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Load current router configuration
  const { data: config, isLoading: configLoading } = useQuery<RouterConfig>({
    queryKey: ['/api/router/config'],
    onSuccess: (data) => {
      if (data) {
        setFormData({
          router_ip: data.router_ip || '',
          ssh_username: data.ssh_username || '',
          ssh_password: data.ssh_password === '***' ? '' : data.ssh_password || '',
          mode: data.mode || 'simulated',
          router_type: data.router_type || 'generic'
        });
      }
    }
  });

  // Get router status
  const { data: status } = useQuery<RouterStatus>({
    queryKey: ['/api/router/status'],
    refetchInterval: 30000
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (testData: { router_ip: string; ssh_username: string; ssh_password: string }) => {
      return apiRequest('/api/router/test-connection', {
        method: 'POST',
        body: JSON.stringify(testData)
      });
    },
    onSuccess: (result: ConnectionTestResult) => {
      setTestResult(result);
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Unable to test connection",
        variant: "destructive"
      });
    }
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: typeof formData) => {
      return apiRequest('/api/router/config', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Router configuration has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/router/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/router/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive"
      });
    }
  });

  // Reset configuration mutation
  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/router/config', {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      setFormData({
        router_ip: '',
        ssh_username: '',
        ssh_password: '',
        mode: 'simulated',
        router_type: 'generic'
      });
      setTestResult(null);
      toast({
        title: "Configuration Reset",
        description: "Router configuration has been reset to defaults",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/router/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/router/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset configuration",
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (testResult) {
      setTestResult(null); // Clear test results when config changes
    }
  };

  const handleTestConnection = () => {
    if (!formData.router_ip || !formData.ssh_username) {
      toast({
        title: "Missing Information",
        description: "Please provide router IP and SSH username",
        variant: "destructive"
      });
      return;
    }

    if (formData.mode === 'real' && !formData.ssh_password) {
      toast({
        title: "Missing Password",
        description: "SSH password is required for real SSH control mode",
        variant: "destructive"
      });
      return;
    }

    testConnectionMutation.mutate({
      router_ip: formData.router_ip,
      ssh_username: formData.ssh_username,
      ssh_password: formData.ssh_password
    });
  };

  const handleSaveConfiguration = () => {
    if (!formData.router_ip || !formData.ssh_username || !formData.mode) {
      toast({
        title: "Missing Information",
        description: "Please provide router IP, SSH username, and mode",
        variant: "destructive"
      });
      return;
    }

    saveConfigMutation.mutate(formData);
  };

  const getStatusBadge = () => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    switch (status.status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected
        </Badge>;
      case 'simulated':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
          <Settings className="w-3 h-3 mr-1" />
          Simulated
        </Badge>;
      case 'failed':
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>;
      default:
        return <Badge variant="outline">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Not Configured
        </Badge>;
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Router className="h-8 w-8" />
            Router Setup
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your router connection for network-based website blocking
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Router Configuration
            </CardTitle>
            <CardDescription>
              Configure your router connection settings for real-time website blocking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="router_ip">Router IP Address</Label>
              <Input
                id="router_ip"
                placeholder="192.168.1.1"
                value={formData.router_ip}
                onChange={(e) => handleInputChange('router_ip', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssh_username">SSH Username</Label>
              <Input
                id="ssh_username"
                placeholder="admin"
                value={formData.ssh_username}
                onChange={(e) => handleInputChange('ssh_username', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssh_password">SSH Password</Label>
              <div className="relative">
                <Input
                  id="ssh_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter SSH password"
                  value={formData.ssh_password}
                  onChange={(e) => handleInputChange('ssh_password', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Control Mode</Label>
              <Select
                value={formData.mode}
                onValueChange={(value) => handleInputChange('mode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulated">Simulated (Demo Mode)</SelectItem>
                  <SelectItem value="real">Real SSH Control</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.mode === 'simulated' 
                  ? 'Uses mock responses for demonstration' 
                  : 'Connects to real router via SSH'
                }
              </p>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending || !formData.router_ip}
                className="flex-1"
                variant="outline"
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>

              <Button
                onClick={handleSaveConfiguration}
                disabled={saveConfigMutation.isPending || !formData.router_ip}
                className="flex-1"
              >
                {saveConfigMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>

            <Button
              onClick={() => resetConfigMutation.mutate()}
              disabled={resetConfigMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {resetConfigMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reset Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Status and Test Results */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status:</span>
                    {getStatusBadge()}
                  </div>
                  <div>
                    <span className="font-medium">Message:</span>
                    <p className="text-sm text-muted-foreground mt-1">{status.message}</p>
                  </div>
                  {status.last_tested && (
                    <div>
                      <span className="font-medium">Last Tested:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(status.last_tested).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No status information available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Connection Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className={testResult.success ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"}>
                  <AlertDescription>
                    <strong>{testResult.success ? 'Success:' : 'Failed:'}</strong> {testResult.message}
                  </AlertDescription>
                </Alert>

                {testResult.success && testResult.connection_info.router_info && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <span className="font-medium">Router Type:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {testResult.connection_info.router_info.router_type}
                      </p>
                    </div>
                    
                    {testResult.connection_info.response_time && (
                      <div>
                        <span className="font-medium">Response Time:</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(testResult.connection_info.response_time * 1000).toFixed(0)}ms
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="font-medium">Capabilities:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(testResult.connection_info.router_info.capabilities || {}).map(([capability, supported]) => (
                          <Badge 
                            key={capability}
                            variant={supported ? "default" : "outline"}
                            className="text-xs"
                          >
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">Tested:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(testResult.tested_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Setup Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Simulated Mode:</span>
                <p className="text-muted-foreground mt-1">
                  Uses mock responses for demonstration. Perfect for testing the interface without real router access.
                </p>
              </div>
              <div>
                <span className="font-medium">Real SSH Control:</span>
                <p className="text-muted-foreground mt-1">
                  Connects to your actual router via SSH. Supports pfSense, OpenWrt, FortiGate, and other SSH-enabled routers.
                </p>
              </div>
              <div>
                <span className="font-medium">Supported Routers:</span>
                <p className="text-muted-foreground mt-1">
                  pfSense, OpenWrt, DD-WRT, Ubiquiti EdgeOS, MikroTik, Cisco IOS, and generic Linux-based routers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}