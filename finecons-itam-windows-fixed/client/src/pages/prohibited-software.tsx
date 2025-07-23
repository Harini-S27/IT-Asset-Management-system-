import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Shield, AlertTriangle, Ban, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProhibitedSoftwareTable } from "@/components/prohibited-software/prohibited-software-table";
import { DetectionLogsTable } from "@/components/prohibited-software/detection-logs-table";
import { AddProhibitedSoftwareDialog } from "@/components/prohibited-software/add-prohibited-software-dialog";
import { ScanDevicesPanel } from "@/components/prohibited-software/scan-devices-panel";

interface ProhibitedSoftwareSummary {
  totalProhibitedSoftware: number;
  totalDetections: number;
  activeThreats: number;
  devicesAffected: number;
}

const ProhibitedSoftwarePage = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Fetch prohibited software summary
  const { data: summary } = useQuery<ProhibitedSoftwareSummary>({
    queryKey: ['/api/prohibited-software-summary'],
  });

  const summaryCards = [
    {
      title: "Prohibited Software",
      value: summary?.totalProhibitedSoftware || 0,
      icon: Ban,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Total Detections",
      value: summary?.totalDetections || 0,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Active Threats",
      value: summary?.activeThreats || 0,
      icon: Shield,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Devices Affected",
      value: summary?.devicesAffected || 0,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Prohibited Software Management</h1>
          <p className="text-gray-500">Monitor and control unauthorized software across your network</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Prohibited Software
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`${card.bgColor} p-2 rounded-lg`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Main Tables */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="prohibited-software" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prohibited-software">Prohibited Software</TabsTrigger>
              <TabsTrigger value="detection-logs">Detection Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="prohibited-software" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ban className="h-5 w-5 mr-2 text-red-600" />
                    Prohibited Software List
                  </CardTitle>
                  <CardDescription>
                    Manage software applications that are banned or restricted on your network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProhibitedSoftwareTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detection-logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                    Detection & Action Logs
                  </CardTitle>
                  <CardDescription>
                    View all instances where prohibited software was detected and actions taken
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DetectionLogsTable />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Scan Panel */}
        <div className="lg:col-span-1">
          <ScanDevicesPanel />
        </div>
      </div>

      {/* Add Prohibited Software Dialog */}
      <AddProhibitedSoftwareDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
      />
    </div>
  );
};

export default ProhibitedSoftwarePage;