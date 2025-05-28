import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeSince } from "@/lib/utils";

interface DetectionLogWithDetails {
  id: number;
  deviceId: number;
  prohibitedSoftwareId: number;
  detectedVersion: string | null;
  detectionDate: string;
  actionTaken: string;
  status: string;
  notes: string | null;
  deviceName?: string;
  softwareName?: string;
}

export function DetectionLogsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch detection logs
  const { data: detectionLogs = [], isLoading } = useQuery<DetectionLogWithDetails[]>({
    queryKey: ['/api/detection-logs'],
    select: (data) => {
      // Transform the data to include device and software names
      return data.map(log => ({
        ...log,
        detectionDate: new Date(log.detectionDate).toISOString(),
      }));
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(`/api/detection-logs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/detection-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prohibited-software-summary'] });
      toast({
        title: "Success",
        description: "Detection log status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Blocked': return 'bg-red-100 text-red-800';
      case 'Uninstalled': return 'bg-orange-100 text-orange-800';
      case 'Flagged': return 'bg-yellow-100 text-yellow-800';
      case 'Ignored': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-red-100 text-red-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Ignored': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const columns = [
    {
      header: "Device",
      accessorKey: "deviceId",
      cell: (item: DetectionLogWithDetails) => (
        <div>
          <div className="font-medium">Device #{item.deviceId}</div>
          {item.deviceName && (
            <div className="text-sm text-gray-500">{item.deviceName}</div>
          )}
        </div>
      ),
    },
    {
      header: "Software Detected",
      accessorKey: "prohibitedSoftwareId",
      cell: (item: DetectionLogWithDetails) => (
        <div>
          <div className="font-medium">Software #{item.prohibitedSoftwareId}</div>
          {item.softwareName && (
            <div className="text-sm text-gray-500">{item.softwareName}</div>
          )}
          {item.detectedVersion && (
            <div className="text-xs text-gray-400">v{item.detectedVersion}</div>
          )}
        </div>
      ),
    },
    {
      header: "Action Taken",
      accessorKey: "actionTaken",
      cell: (item: DetectionLogWithDetails) => (
        <Badge className={getActionColor(item.actionTaken)}>
          {item.actionTaken}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (item: DetectionLogWithDetails) => (
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(item.status)}>
            {item.status}
          </Badge>
          {item.status === 'Active' && (
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => handleStatusChange(item.id, 'Resolved')}
                disabled={updateStatusMutation.isPending}
              >
                Resolve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => handleStatusChange(item.id, 'Ignored')}
                disabled={updateStatusMutation.isPending}
              >
                Ignore
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Detection Time",
      accessorKey: "detectionDate",
      cell: (item: DetectionLogWithDetails) => (
        <div>
          <div className="text-sm">{formatTimeSince(item.detectionDate)}</div>
          <div className="text-xs text-gray-500">
            {new Date(item.detectionDate).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      header: "Notes",
      accessorKey: "notes",
      cell: (item: DetectionLogWithDetails) => (
        <div className="max-w-xs">
          {item.notes ? (
            <div className="text-sm text-gray-600 truncate" title={item.notes}>
              {item.notes}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">No notes</span>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <DataTable
      data={detectionLogs}
      columns={columns}
      searchable
      pagination
    />
  );
}