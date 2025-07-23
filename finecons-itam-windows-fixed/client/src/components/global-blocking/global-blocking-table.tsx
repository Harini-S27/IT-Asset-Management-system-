import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth-context';
import {
  Shield,
  ShieldOff,
  Plus,
  RefreshCw,
  Trash2,
  Globe,
  Router,
  AlertCircle,
  CheckCircle,
  Lock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BlockedDomain {
  domain: string;
  reason: string;
  created_by: string;
  created_at: string;
  applied_devices: string[];
  status: string;
}

interface BlockingStatus {
  mode: string;
  blocked_domains_count: number;
  total_devices: number;
  router_connected: boolean;
  last_updated: string;
}

export function GlobalBlockingTable() {
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const canManage = hasPermission('block_websites');
  const canView = hasPermission('view_network');

  // Fetch blocked domains
  const { data: blockedDomains = [], isLoading, refetch } = useQuery<BlockedDomain[]>({
    queryKey: ['/api/global-blocks'],
    refetchInterval: 30000,
  });

  // Fetch blocking status
  const { data: blockingStatus } = useQuery<BlockingStatus>({
    queryKey: ['/api/global-blocks/status'],
    refetchInterval: 30000,
  });

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async (data: { domain: string; reason: string }) => {
      const response = await fetch('/api/global-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: data.domain,
          reason: data.reason || 'Global network block',
          createdBy: 'admin'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to block domain');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Domain Blocked",
        description: `${data.domain} has been blocked network-wide`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/global-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-blocks/status'] });
      setNewDomain('');
      setBlockReason('');
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Block Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Remove domain mutation
  const removeDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await fetch(`/api/global-blocks/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedBy: 'admin' })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unblock domain');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Domain Unblocked",
        description: `${data.domain} has been unblocked network-wide`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/global-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-blocks/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Unblock Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Reapply rules mutation
  const reapplyRulesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/global-blocks/reapply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reapply rules');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rules Applied",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/global-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-blocks/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Reapply Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast({
        title: "Domain Required",
        description: "Please enter a domain to block",
        variant: "destructive"
      });
      return;
    }

    const cleanDomain = newDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');

    addDomainMutation.mutate({
      domain: cleanDomain,
      reason: blockReason.trim() || 'Global network block'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      header: "Domain",
      accessorKey: "domain",
      cell: (domain: BlockedDomain) => (
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{domain.domain}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (domain: BlockedDomain) => (
        <Badge variant={domain.status === 'active' ? 'destructive' : 'secondary'}>
          {domain.status === 'active' ? (
            <>
              <Shield className="h-3 w-3 mr-1" />
              Blocked
            </>
          ) : (
            <>
              <ShieldOff className="h-3 w-3 mr-1" />
              Inactive
            </>
          )}
        </Badge>
      ),
    },
    {
      header: "Reason",
      accessorKey: "reason",
      cell: (domain: BlockedDomain) => (
        <span className="text-sm text-muted-foreground">{domain.reason}</span>
      ),
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: (domain: BlockedDomain) => (
        <div className="text-sm">
          <div>{formatDate(domain.created_at)}</div>
          <div className="text-xs text-muted-foreground">by {domain.created_by}</div>
        </div>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (domain: BlockedDomain) => (
        canManage ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeDomainMutation.mutate(domain.domain)}
            disabled={removeDomainMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center text-xs text-muted-foreground">
            <Lock className="h-3 w-3 mr-1" />
            Read Only
          </div>
        )
      ),
    },
  ];

  const getModeIcon = () => {
    if (!blockingStatus) return <AlertCircle className="h-4 w-4" />;
    
    if (blockingStatus.mode === 'real_ssh') {
      return blockingStatus.router_connected ? 
        <CheckCircle className="h-4 w-4 text-green-600" /> : 
        <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    
    return <Router className="h-4 w-4 text-blue-600" />;
  };

  const getModeText = () => {
    if (!blockingStatus) return "Unknown";
    
    if (blockingStatus.mode === 'real_ssh') {
      return blockingStatus.router_connected ? "SSH Connected" : "SSH Disconnected";
    }
    
    return "Simulated Mode";
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {getModeIcon()}
              <div>
                <div className="text-sm font-medium">{getModeText()}</div>
                <div className="text-xs text-muted-foreground">Control Mode</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-sm font-medium">{blockingStatus?.blocked_domains_count || 0}</div>
                <div className="text-xs text-muted-foreground">Blocked Domains</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">{blockingStatus?.total_devices || 0}</div>
                <div className="text-xs text-muted-foreground">Protected Devices</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">
                  {blockingStatus?.last_updated ? 
                    formatDate(blockingStatus.last_updated) : 'Never'
                  }
                </div>
                <div className="text-xs text-muted-foreground">Last Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Globally Blocked Websites</CardTitle>
              <CardDescription>
                Domains blocked across all network devices. Rules are applied {blockingStatus?.mode === 'real_ssh' ? 'via SSH router control' : 'in simulation mode'}.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {canManage ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reapplyRulesMutation.mutate()}
                    disabled={reapplyRulesMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reapply Rules
                  </Button>
                  
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Block Domain
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Block New Domain</DialogTitle>
                        <DialogDescription>
                          Add a domain to block across all network devices. Rules will be applied {blockingStatus?.mode === 'real_ssh' ? 'to your router via SSH' : 'in simulation mode'}.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="domain">Domain</Label>
                          <Input
                            id="domain"
                            placeholder="facebook.com, youtube.com, twitter.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="reason">Reason (Optional)</Label>
                          <Textarea
                            id="reason"
                            placeholder="Productivity policy, inappropriate content, etc."
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddDomain}
                          disabled={addDomainMutation.isPending}
                        >
                          {addDomainMutation.isPending ? 'Blocking...' : 'Block Domain'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <div className="flex items-center text-sm text-muted-foreground bg-gray-50 px-3 py-2 rounded-md">
                  <Lock className="h-4 w-4 mr-2" />
                  Read-only access - Contact Admin/Manager to modify blocking rules
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading blocked domains...</p>
              </div>
            </div>
          ) : blockedDomains.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No blocked domains</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding domains to block across your network
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Block Your First Domain
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {blockedDomains.map((domain, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-mono font-medium">{domain.domain}</div>
                      <div className="text-sm text-muted-foreground">{domain.reason}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge variant={domain.status === 'active' ? 'destructive' : 'secondary'}>
                      {domain.status === 'active' ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Blocked
                        </>
                      ) : (
                        <>
                          <ShieldOff className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                    
                    <div className="text-right text-sm">
                      <div>{formatDate(domain.created_at)}</div>
                      <div className="text-xs text-muted-foreground">by {domain.created_by}</div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomainMutation.mutate(domain.domain)}
                      disabled={removeDomainMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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