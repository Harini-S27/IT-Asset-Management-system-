import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowRight, 
  Server, 
  Monitor, 
  MapPin, 
  AlertCircle, 
  CheckCircle2,
  Shield,
  Package,
  FileCheck,
  Clock,
  AlertTriangle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { Device } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProhibitedSoftwareSummary {
  totalProhibitedSoftware: number;
  totalDetections: number;
  activeThreats: number;
  devicesAffected: number;
}

const Dashboard = () => {
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const { data: prohibitedSummary } = useQuery<ProhibitedSoftwareSummary>({
    queryKey: ['/api/prohibited-software-summary'],
  });

  if (isLoading) {
    return <div>Loading dashboard data...</div>;
  }

  // Computer Audit Summary Data
  const auditSummaryData = [
    { status: 'Succeeded', count: 145, color: '#22c55e' },
    { status: 'Failed', count: 23, color: '#ef4444' },
    { status: 'Not Scanned', count: 67, color: '#6b7280' },
    { status: 'In Progress', count: 12, color: '#3b82f6' },
  ];

  // Computers by OS Data
  const osSummaryData = [
    { os: 'Windows 10', count: 89 },
    { os: 'Windows 11', count: 67 },
    { os: 'Windows Server', count: 34 },
    { os: 'Ubuntu', count: 28 },
    { os: 'macOS', count: 15 },
    { os: 'Windows 7', count: 8 },
    { os: 'Windows XP', count: 6 },
  ];

  // Software Summary Data
  const softwareSummary = {
    totalSoftware: 1247,
    commercialSoftware: 892,
    nonCommercialSoftware: 355,
    prohibitedSoftware: prohibitedSummary?.totalProhibitedSoftware || 8,
  };

  // Software Compliance Summary
  const complianceSummary = {
    licenseInCompliance: 734,
    overLicensed: 89,
    underLicensed: 45,
    expiredLicense: 24,
  };

  // Warranty Summary
  const warrantySummary = {
    warrantyInCompliance: 186,
    expiredWarranty: 43,
    unidentified: 18,
  };

  // Prohibited Software Detection Summary
  const prohibitedSoftwareData = {
    detected: prohibitedSummary?.totalDetections || 12,
    blocked: 8,
    recentActions: [
      { software: 'BitTorrent Client', action: 'Blocked', device: 'WS-001-DEV', time: '2 hours ago' },
      { software: 'Cryptocurrency Miner', action: 'Uninstalled', device: 'LT-045-MKT', time: '4 hours ago' },
      { software: 'TeamViewer Personal', action: 'Flagged', device: 'WS-012-FIN', time: '6 hours ago' },
    ]
  };

  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.status === "Active").length;
  const inactiveDevices = devices.filter(d => d.status === "Inactive").length;
  const maintenanceDevices = devices.filter(d => d.status === "Maintenance").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit & Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of computer audit status, software compliance, and security monitoring
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Computers</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">
              Managed devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">89%</div>
            <p className="text-xs text-muted-foreground">
              Successfully audited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{prohibitedSummary?.activeThreats || 3}</div>
            <p className="text-xs text-muted-foreground">
              Active threats detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">94%</div>
            <p className="text-xs text-muted-foreground">
              Overall compliance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Computer Audit Summary Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Computer Audit Summary</CardTitle>
            <CardDescription>Scan status across all managed computers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditSummaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Computers by OS Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Computers by Operating System</CardTitle>
            <CardDescription>Operating system distribution across the network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={osSummaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="os" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Tables Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Software Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" />
              Software Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Software</span>
              <Badge variant="outline">{softwareSummary.totalSoftware}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Commercial Software</span>
              <Badge className="bg-green-100 text-green-800">{softwareSummary.commercialSoftware}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Non-Commercial Software</span>
              <Badge className="bg-blue-100 text-blue-800">{softwareSummary.nonCommercialSoftware}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Prohibited Software</span>
              <Badge className="bg-red-100 text-red-800">{softwareSummary.prohibitedSoftware}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Software Compliance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileCheck className="h-5 w-5 mr-2 text-green-600" />
              License Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">In Compliance</span>
              <Badge className="bg-green-100 text-green-800">{complianceSummary.licenseInCompliance}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Over Licensed</span>
              <Badge className="bg-yellow-100 text-yellow-800">{complianceSummary.overLicensed}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Under Licensed</span>
              <Badge className="bg-orange-100 text-orange-800">{complianceSummary.underLicensed}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Expired License</span>
              <Badge className="bg-red-100 text-red-800">{complianceSummary.expiredLicense}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Warranty Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-purple-600" />
              Warranty Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">In Compliance</span>
              <Badge className="bg-green-100 text-green-800">{warrantySummary.warrantyInCompliance}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Expired Warranty</span>
              <Badge className="bg-red-100 text-red-800">{warrantySummary.expiredWarranty}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Unidentified</span>
              <Badge className="bg-gray-100 text-gray-800">{warrantySummary.unidentified}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Devices</span>
              <Badge variant="outline">{warrantySummary.warrantyInCompliance + warrantySummary.expiredWarranty + warrantySummary.unidentified}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Prohibited Software Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-red-600" />
              Security Threats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Threats Detected</span>
              <Badge className="bg-red-100 text-red-800">{prohibitedSoftwareData.detected}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Threats Blocked</span>
              <Badge className="bg-orange-100 text-orange-800">{prohibitedSoftwareData.blocked}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Devices Affected</span>
              <Badge className="bg-yellow-100 text-yellow-800">{prohibitedSummary?.devicesAffected || 4}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Threats</span>
              <Badge className="bg-red-100 text-red-800">{prohibitedSummary?.activeThreats || 3}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Recent Security Actions
          </CardTitle>
          <CardDescription>Latest prohibited software detections and actions taken</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prohibitedSoftwareData.recentActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Shield className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{action.software}</div>
                    <div className="text-xs text-gray-500">Device: {action.device}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={
                      action.action === 'Blocked' ? 'bg-red-100 text-red-800' :
                      action.action === 'Uninstalled' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {action.action}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">{action.time}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
