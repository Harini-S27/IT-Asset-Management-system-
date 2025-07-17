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
  User,
  Settings,
  Lock,
  Smartphone,
  Camera
} from "lucide-react";
import { Device } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  if (isLoading) {
    return <div>Loading dashboard data...</div>;
  }

  // Calculate counts and stats
  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.status === "Active").length;
  const inactiveDevices = devices.filter(d => d.status === "Inactive").length;
  const maintenanceDevices = devices.filter(d => d.status === "Maintenance").length;
  
  const locationCounts = devices.reduce((acc: {[key: string]: number}, device) => {
    acc[device.location] = (acc[device.location] || 0) + 1;
    return acc;
  }, {});
  
  const typeCounts = devices.reduce((acc: {[key: string]: number}, device) => {
    if (device.type !== 'Unknown') {
      acc[device.type] = (acc[device.type] || 0) + 1;
    }
    return acc;
  }, {});

  // Get recent devices
  const recentDevices = [...devices]
    .sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime())
    .slice(0, 5);

  // Role-specific capabilities
  const getRoleCapabilities = () => {
    if (!user) return [];
    
    const capabilities = {
      Admin: [
        "Full system administration",
        "User management and system settings", 
        "Complete device and network control",
        "All reporting and export capabilities"
      ],
      Manager: [
        "Device and software management",
        "Network configuration and blocking",
        "Router setup and monitoring",
        "Operational reporting"
      ],
      Viewer: [
        "View all devices and reports",
        "Monitor network discovery",
        "Access prohibited software list",
        "Read-only dashboard access"
      ]
    };
    
    return capabilities[user.role as keyof typeof capabilities] || [];
  };

  const getRoleColor = () => {
    if (!user) return "gray";
    
    const colors = {
      Admin: "red",
      Manager: "blue", 
      Viewer: "green"
    };
    
    return colors[user.role as keyof typeof colors] || "gray";
  };

  return (
    <div className="space-y-6">
      {/* Role-Based Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.username}</h1>
                <p className="text-gray-600">IT Asset Management Dashboard</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge 
              variant="outline" 
              className="px-3 py-1 text-sm font-medium"
            >
              <Shield className="h-3 w-3 mr-1" />
              {user?.role} Access
            </Badge>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Access Level</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {getRoleCapabilities().map((capability, index) => (
                <li key={index} className="flex items-center">
                  <CheckCircle2 className="h-3 w-3 text-green-600 mr-2 flex-shrink-0" />
                  {capability}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-lg font-bold text-gray-800">{totalDevices}</div>
              <div className="text-sm text-gray-600">Devices Under Management</div>
              <div className="text-xs text-gray-500 mt-1">
                {hasPermission('edit_devices') ? 'Full Control' : 'View Only'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">System Overview</h2>
          <p className="text-gray-500">Current status of your IT infrastructure</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDevices}</div>
            <p className="text-xs text-gray-500 mt-1">Across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeDevices}</div>
            <p className="text-xs text-gray-500 mt-1">{totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0}% of total devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{maintenanceDevices}</div>
            <p className="text-xs text-gray-500 mt-1">{totalDevices > 0 ? Math.round((maintenanceDevices / totalDevices) * 100) : 0}% of total devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{inactiveDevices}</div>
            <p className="text-xs text-gray-500 mt-1">{totalDevices > 0 ? Math.round((inactiveDevices / totalDevices) * 100) : 0}% of total devices</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device by Type - Sequential List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Device Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(typeCounts)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count], index) => (
                  <div key={type} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        {type === "Workstation" ? (
                          <Monitor className="h-4 w-4 text-blue-600" />
                        ) : type === "Server" ? (
                          <Server className="h-4 w-4 text-purple-600" />
                        ) : type === "Laptop" ? (
                          <Monitor className="h-4 w-4 text-green-600" />
                        ) : type === "Mobile" ? (
                          <Smartphone className="h-4 w-4 text-orange-600" />
                        ) : type === "Security Camera" ? (
                          <Camera className="h-4 w-4 text-red-600" />
                        ) : (
                          <Monitor className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{type}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${totalDevices > 0 ? Math.min((count / totalDevices) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">
                        {totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/devices">
                <Button variant="link" className="text-[#4299E1] p-0 h-auto">
                  View all devices <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Devices by Location - Sequential List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(locationCounts)
                .sort(([,a], [,b]) => b - a)
                .map(([location, count], index) => (
                  <div key={location} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{location}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${totalDevices > 0 ? Math.min((count / totalDevices) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">
                        {totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/map">
                <Button variant="link" className="text-[#4299E1] p-0 h-auto">
                  View map <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recently Updated Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {recentDevices.map(device => (
                  <tr key={device.id} className="border-b">
                    <td className="py-3">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-xs text-gray-500">{device.model}</div>
                    </td>
                    <td className="py-3">{device.type}</td>
                    <td className="py-3">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                        {device.location}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center">
                        {device.status === 'Active' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                        ) : device.status === 'Inactive' ? (
                          <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                        )}
                        {device.status}
                      </div>
                    </td>
                    <td className="py-3">{device.ipAddress || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right">
            <Link href="/devices">
              <Button variant="link" className="text-[#4299E1]">
                View all devices <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
