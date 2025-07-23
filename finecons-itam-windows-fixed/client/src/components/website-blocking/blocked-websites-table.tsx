import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Shield, 
  X, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { formatTimeSince, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface WebsiteBlock {
  id: number;
  deviceId: number | null;
  networkDeviceId: number | null;
  targetDomain: string;
  blockType: string;
  status: string;
  createdBy: string;
  createdAt: string;
  activatedAt: string | null;
  reason: string | null;
  firewallRule: string | null;
  errorMessage: string | null;
}

interface BlockingHistory {
  id: number;
  websiteBlockId: number;
  action: string;
  timestamp: string;
  details: string | null;
  performedBy: string | null;
}

interface BlockedWebsitesTableProps {
  deviceId?: number;
  networkDeviceId?: number;
}

const BlockedWebsitesTable = ({ deviceId, networkDeviceId }: BlockedWebsitesTableProps) => {
  const [selectedBlock, setSelectedBlock] = useState<WebsiteBlock | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  // Get website blocks for specific device or all blocks
  const queryKey = deviceId 
    ? ['/api/website-blocks/device', deviceId]
    : ['/api/website-blocks'];
  
  const queryUrl = deviceId 
    ? `/api/website-blocks/device/${deviceId}`
    : '/api/website-blocks';

  const { data: websiteBlocks = [], isLoading, refetch } = useQuery<WebsiteBlock[]>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(queryUrl);
      if (!response.ok) throw new Error('Failed to fetch website blocks');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for status updates
  });

  const { data: blockHistory = [] } = useQuery<BlockingHistory[]>({
    queryKey: ['/api/website-blocks', selectedBlock?.id, 'history'],
    queryFn: async () => {
      if (!selectedBlock?.id) return [];
      const response = await fetch(`/api/website-blocks/${selectedBlock.id}/history`);
      if (!response.ok) throw new Error('Failed to fetch blocking history');
      return response.json();
    },
    enabled: !!selectedBlock?.id,
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      const response = await fetch(`/api/website-blocks/${blockId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performedBy: 'admin' }),
      });
      if (!response.ok) throw new Error('Failed to remove website block');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Website unblocked",
        description: "The website block has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove website block: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "active": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      case "removed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "failed": return <XCircle className="h-4 w-4" />;
      case "removed": return <X className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getBlockTypeColor = (blockType: string): string => {
    switch (blockType.toLowerCase()) {
      case "domain": return "bg-blue-100 text-blue-800";
      case "url": return "bg-purple-100 text-purple-800";
      case "ip": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const columns = [
    {
      header: "Domain/URL",
      accessorKey: "targetDomain",
      cell: (block: WebsiteBlock) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-md bg-red-100 mr-3 flex items-center justify-center">
            <Shield className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{block.targetDomain}</div>
            <div className="text-xs text-gray-500">
              <Badge className={cn("text-xs", getBlockTypeColor(block.blockType))}>
                {block.blockType}
              </Badge>
            </div>
          </div>
        </div>
      ),
      enableSorting: true,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (block: WebsiteBlock) => (
        <div className="flex items-center space-x-2">
          <Badge className={cn("text-xs flex items-center space-x-1", getStatusColor(block.status))}>
            {getStatusIcon(block.status)}
            <span>{block.status}</span>
          </Badge>
        </div>
      ),
    },
    {
      header: "Reason",
      accessorKey: "reason",
      cell: (block: WebsiteBlock) => (
        <div className="max-w-xs">
          <div className="text-sm text-gray-900 truncate">
            {block.reason || "No reason provided"}
          </div>
        </div>
      ),
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (block: WebsiteBlock) => (
        <div>
          <div className="text-sm text-gray-900">
            {formatTimeSince(block.createdAt)}
          </div>
          <div className="text-xs text-gray-500">by {block.createdBy}</div>
        </div>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (block: WebsiteBlock) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBlock(block);
              setShowHistory(true);
            }}
          >
            <History className="h-4 w-4" />
          </Button>
          {block.status !== "removed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unblockMutation.mutate(block.id)}
              disabled={unblockMutation.isPending}
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-pulse mx-auto mb-2 text-red-600" />
          <p className="text-sm text-gray-600">Loading blocked websites...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{websiteBlocks.length}</div>
              <p className="text-xs text-muted-foreground">Active blocking rules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {websiteBlocks.filter(b => b.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">Currently blocking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {websiteBlocks.filter(b => b.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">Being processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {websiteBlocks.filter(b => b.status === "failed").length}
              </div>
              <p className="text-xs text-muted-foreground">Configuration errors</p>
            </CardContent>
          </Card>
        </div>

        {/* Blocked websites table */}
        <div className="border rounded-lg">
          <DataTable 
            data={websiteBlocks} 
            columns={columns}
          />
        </div>
      </div>

      {/* Block History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Block History: {selectedBlock?.targetDomain}
            </DialogTitle>
            <DialogDescription>
              Track the lifecycle of this website block
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Current Status</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={cn("text-xs flex items-center space-x-1", getStatusColor(selectedBlock?.status || ""))}>
                    {getStatusIcon(selectedBlock?.status || "")}
                    <span>{selectedBlock?.status}</span>
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Block Type</label>
                <div className="mt-1">
                  <Badge className={cn("text-xs", getBlockTypeColor(selectedBlock?.blockType || ""))}>
                    {selectedBlock?.blockType}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {selectedBlock?.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-700 mt-1">{selectedBlock.errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Firewall Rule */}
            {selectedBlock?.firewallRule && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex">
                  <Shield className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">Firewall Rule</h4>
                    <p className="text-sm text-blue-700 mt-1 font-mono">{selectedBlock.firewallRule}</p>
                  </div>
                </div>
              </div>
            )}

            {/* History Timeline */}
            <div>
              <h4 className="text-sm font-medium mb-2">Activity History</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {blockHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(entry.action)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium capitalize">{entry.action}</div>
                      <div className="text-xs text-gray-600">{entry.details}</div>
                      <div className="text-xs text-gray-500">
                        {formatTimeSince(entry.timestamp)} by {entry.performedBy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlockedWebsitesTable;