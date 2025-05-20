import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowRight, 
  Server, 
  Monitor, 
  MapPin, 
  AlertCircle, 
  CheckCircle2
} from "lucide-react";
import { Device } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
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
    acc[device.type] = (acc[device.type] || 0) + 1;
    return acc;
  }, {});

  // Get recent devices
  const recentDevices = [...devices]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Overview of your IT asset management</p>
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
            <p className="text-xs text-gray-500 mt-1">{Math.round((activeDevices / totalDevices) * 100)}% of total devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{maintenanceDevices}</div>
            <p className="text-xs text-gray-500 mt-1">{Math.round((maintenanceDevices / totalDevices) * 100)}% of total devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{inactiveDevices}</div>
            <p className="text-xs text-gray-500 mt-1">{Math.round((inactiveDevices / totalDevices) * 100)}% of total devices</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center">
                  <div className="w-16 flex-shrink-0">
                    {type === "Workstation" ? (
                      <Monitor className="h-6 w-6 text-blue-500" />
                    ) : type === "Server" ? (
                      <Server className="h-6 w-6 text-purple-500" />
                    ) : (
                      <Monitor className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{type}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#4299E1] h-2 rounded-full" 
                        style={{ width: `${(count / totalDevices) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-right">
              <Link href="/devices">
                <Button variant="link" className="text-[#4299E1]">
                  View all devices <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Devices by Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(locationCounts).map(([location, count]) => (
                <div key={location} className="flex items-center">
                  <div className="w-16 flex-shrink-0">
                    <MapPin className="h-6 w-6 text-[#4299E1]" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{location}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#4299E1] h-2 rounded-full" 
                        style={{ width: `${(count / totalDevices) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-right">
              <Link href="/map">
                <Button variant="link" className="text-[#4299E1]">
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
