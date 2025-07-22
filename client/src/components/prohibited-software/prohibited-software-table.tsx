import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Edit, Trash2, Shield, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ProhibitedSoftware } from "@shared/schema";
import { EditProhibitedSoftwareDialog } from "./edit-prohibited-software-dialog";

export function ProhibitedSoftwareTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<ProhibitedSoftware | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch prohibited software data
  const { data: prohibitedSoftware = [], isLoading } = useQuery<ProhibitedSoftware[]>({
    queryKey: ['/api/prohibited-software'],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/prohibited-software/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete prohibited software');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prohibited-software'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prohibited-software-summary'] });
      toast({
        title: "Success",
        description: "Prohibited software deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete prohibited software",
        variant: "destructive",
      });
    },
  });

  // Update mutation for toggles
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProhibitedSoftware> }) => {
      const response = await apiRequest(`/api/prohibited-software/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update prohibited software');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prohibited-software'] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: ProhibitedSoftware) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this prohibited software entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleBlockExecution = (item: ProhibitedSoftware) => {
    updateMutation.mutate({
      id: item.id,
      data: { blockExecution: !item.blockExecution }
    });
  };

  const handleToggleAutoUninstall = (item: ProhibitedSoftware) => {
    updateMutation.mutate({
      id: item.id,
      data: { autoUninstall: !item.autoUninstall }
    });
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      header: "Software Name",
      accessorKey: "name",
      cell: (item: ProhibitedSoftware) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">{item.name}</div>
          <div className="text-sm text-gray-600">{item.executableName}</div>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (item: ProhibitedSoftware) => (
        <Badge variant="outline" className="font-medium">{item.category}</Badge>
      ),
    },
    {
      header: "Risk Level",
      accessorKey: "riskLevel",
      cell: (item: ProhibitedSoftware) => (
        <Badge className={`${getRiskLevelColor(item.riskLevel)} font-medium px-3 py-1`}>
          {item.riskLevel}
        </Badge>
      ),
    },
    {
      header: "Block Execution",
      accessorKey: "blockExecution",
      cell: (item: ProhibitedSoftware) => (
        <div className="flex items-center space-x-3 justify-center">
          <Switch
            checked={item.blockExecution}
            onCheckedChange={() => handleToggleBlockExecution(item)}
            disabled={updateMutation.isPending}
          />
          {item.blockExecution && (
            <Ban className="h-4 w-4 text-red-500" />
          )}
        </div>
      ),
    },
    {
      header: "Auto Uninstall",
      accessorKey: "autoUninstall",
      cell: (item: ProhibitedSoftware) => (
        <div className="flex items-center space-x-3 justify-center">
          <Switch
            checked={item.autoUninstall}
            onCheckedChange={() => handleToggleAutoUninstall(item)}
            disabled={updateMutation.isPending}
          />
          {item.autoUninstall && (
            <Shield className="h-4 w-4 text-blue-500" />
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (item: ProhibitedSoftware) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-gray-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleEdit(item)} className="py-2">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(item.id)}
                className="text-red-600 py-2"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
    <>
      <DataTable
        data={prohibitedSoftware}
        columns={columns}
        searchable
        pagination
      />
      
      <EditProhibitedSoftwareDialog
        software={editingItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onClose={() => {
          setEditingItem(null);
          setEditDialogOpen(false);
        }}
      />
    </>
  );
}