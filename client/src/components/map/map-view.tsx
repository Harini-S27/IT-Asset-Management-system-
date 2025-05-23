import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Device } from '@shared/schema';
import { 
  MapPin, 
  Filter, 
  Layers, 
  RefreshCw,
  List
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Define marker icons
const createMarkerIcon = (status: string) => {
  let color = '#48BB78'; // Default green for active (success)
  let borderColor = '#38A169'; // Darker green border
  
  if (status === 'Inactive') {
    color = '#F56565'; // Red for inactive/offline
    borderColor = '#E53E3E'; // Darker red border
  } else if (status === 'Maintenance') {
    color = '#ECC94B'; // Yellow for maintenance
    borderColor = '#D69E2E'; // Darker yellow border
  }
  
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div style="position: relative; width: 36px; height: 36px;">
             <div style="position: absolute; top: 0; left: 3px; background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid ${borderColor}; box-shadow: 0 0 8px rgba(0,0,0,0.5);">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>
             <div style="position: absolute; bottom: 0; left: 12px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid ${borderColor};"></div>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// Create cluster marker icon
const createClusterIcon = (count: number) => {
  return L.divIcon({
    className: 'custom-cluster-icon',
    html: `<div style="background-color: #4299E1; color: white; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid #3182CE; box-shadow: 0 0 8px rgba(0,0,0,0.5);">
            ${count > 99 ? '99+' : count}
           </div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });
};

// Fix the map icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapComponent = () => {
  const mapRef = useRef<L.Map | null>(null);
  const markerClusterGroupRef = useRef<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clusterMode, setClusterMode] = useState<boolean>(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [mapMode, setMapMode] = useState<string>('streets');
  
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Initialize map
  useEffect(() => {
    // Small delay to ensure the DOM is fully rendered
    const timer = setTimeout(() => {
      const container = document.getElementById('mapContainer');
      
      if (container && !mapRef.current) {
        console.log("Initializing map with container:", container);
        // Set initial view to San Francisco
        mapRef.current = L.map('mapContainer', {
          center: [37.7749, -122.4194],
          zoom: 10,
          zoomControl: false,
        });

        // Add zoom control to the top right
        L.control.zoom({ position: 'topright' }).addTo(mapRef.current);

        // Add the base map layer (streets)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Change map style when mapMode changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Remove all existing tile layers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });
    
    // Add the appropriate tile layer based on selected mode
    if (mapMode === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(mapRef.current);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }
  }, [mapMode]);

  // Filter and add markers to map
  useEffect(() => {
    if (!mapRef.current || !devices.length) return;

    // Filter devices based on selected filters
    const filteredDevices = devices.filter(device => {
      const statusMatch = statusFilter === 'all' || device.status === statusFilter;
      const typeMatch = typeFilter === 'all' || device.type === typeFilter;
      return statusMatch && typeMatch && device.latitude && device.longitude;
    });
    
    // Clear existing markers
    if (markerClusterGroupRef.current) {
      markerClusterGroupRef.current.clearLayers();
      mapRef.current.removeLayer(markerClusterGroupRef.current);
    }
    
    // If clustering is enabled
    if (clusterMode) {
      try {
        // Group devices by location (for clustering)
        const locationGroups: Record<string, Device[]> = {};
        filteredDevices.forEach(device => {
          if (device.latitude && device.longitude) {
            // Create a string key to group devices at the same coordinates
            const key = `${device.latitude}-${device.longitude}`;
            if (!locationGroups[key]) {
              locationGroups[key] = [];
            }
            locationGroups[key].push(device);
          }
        });
        
        // Create markers
        const markers: L.Marker[] = [];
        Object.entries(locationGroups).forEach(([key, devicesAtLocation]) => {
          const [lat, lng] = key.split('-');
          // Parse the coordinates safely
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lng);
          
          // Skip invalid coordinates
          if (isNaN(latitude) || isNaN(longitude)) return;
          
          // Determine status for marker icon
          // If any device in the group is active, use active status
          let markerStatus = 'Inactive';
          if (devicesAtLocation.some(d => d.status === 'Active')) {
            markerStatus = 'Active';
          } else if (devicesAtLocation.some(d => d.status === 'Maintenance')) {
            markerStatus = 'Maintenance';
          }
          
          // Create marker with custom icon
          const position = L.latLng(latitude, longitude);
          const marker = L.marker(position, { 
            icon: devicesAtLocation.length > 1 ? 
              createClusterIcon(devicesAtLocation.length) : 
              createMarkerIcon(markerStatus)
          });
          
          // Add popup with device details
          marker.bindPopup(createPopupContent(devicesAtLocation))
                .on('click', () => {
                  // Set the first device in the location as the selected device
                  setSelectedDevice(devicesAtLocation[0]);
                });
          
          markers.push(marker);
        });
        
        // Add markers to map
        if (markers.length > 0) {
          // Create a feature group for all markers
          const featureGroup = L.featureGroup(markers).addTo(mapRef.current);
          markerClusterGroupRef.current = featureGroup;
          
          // Fit the map bounds to show all markers
          mapRef.current.fitBounds(featureGroup.getBounds(), {
            padding: [50, 50],
            maxZoom: 14
          });
        }
      } catch (error) {
        console.error("Error adding markers to map:", error);
      }
    } else {
      // Add individual markers without clustering
      const markers: L.Marker[] = [];
      
      filteredDevices.forEach(device => {
        if (device.latitude && device.longitude) {
          const latitude = parseFloat(device.latitude);
          const longitude = parseFloat(device.longitude);
          
          // Skip invalid coordinates
          if (isNaN(latitude) || isNaN(longitude)) return;
          
          const position = L.latLng(latitude, longitude);
          const marker = L.marker(position, { 
            icon: createMarkerIcon(device.status) 
          });
          
          marker.bindPopup(createDevicePopup(device))
                .on('click', () => {
                  setSelectedDevice(device);
                })
                .bindTooltip(`${device.name} - ${device.status}`, {
                  direction: 'top',
                  offset: L.point(0, -30)
                });
          
          markers.push(marker);
        }
      });
      
      // Add markers to map
      if (markers.length > 0) {
        const featureGroup = L.featureGroup(markers).addTo(mapRef.current);
        markerClusterGroupRef.current = featureGroup;
        
        mapRef.current.fitBounds(featureGroup.getBounds(), {
          padding: [50, 50],
          maxZoom: 14
        });
      }
    }
  }, [devices, statusFilter, typeFilter, clusterMode]);

  // Create HTML content for popup for a single device
  const createDevicePopup = (device: Device) => {
    const statusClass = 
      device.status === 'Active' ? 'bg-green-100 text-green-800' : 
      device.status === 'Inactive' ? 'bg-red-100 text-red-800' : 
      'bg-yellow-100 text-yellow-800';
    
    return `
      <div class="map-device-popup">
        <h3 class="text-lg font-semibold mb-1">${device.name}</h3>
        <div class="text-sm mb-2">${device.model}</div>
        <div class="flex items-center mb-2">
          <span class="${statusClass} text-xs px-2 py-0.5 rounded-full font-medium">${device.status}</span>
        </div>
        <div class="text-sm text-gray-600 mb-1"><strong>Type:</strong> ${device.type}</div>
        <div class="text-sm text-gray-600 mb-1"><strong>Location:</strong> ${device.location}</div>
        <div class="text-sm text-gray-600"><strong>IP:</strong> ${device.ipAddress || 'N/A'}</div>
        <div class="mt-3 text-xs text-right text-gray-500">Click for more details</div>
      </div>
    `;
  };

  // Create HTML content for popup for a group of devices
  const createPopupContent = (devices: Device[]) => {
    const locationName = devices[0]?.location || 'Unknown';
    
    const html = `
      <div class="map-popup">
        <h3 class="text-base font-semibold mb-2">${locationName}</h3>
        <p class="text-sm mb-2">${devices.length} device${devices.length !== 1 ? 's' : ''}</p>
        <ul class="text-xs max-h-48 overflow-y-auto">
          ${devices.map(device => {
            const statusClass = 
              device.status === 'Active' ? 'bg-green-100 text-green-800' : 
              device.status === 'Inactive' ? 'bg-red-100 text-red-800' : 
              'bg-yellow-100 text-yellow-800';
            
            return `
              <li class="py-2 border-b border-gray-100">
                <div class="font-medium mb-1">${device.name}</div>
                <div class="flex items-center justify-between">
                  <div class="text-gray-500">${device.type}</div>
                  <span class="${statusClass} text-xs px-2 py-0.5 rounded-full font-medium">${device.status}</span>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
        <div class="mt-2 text-xs text-center">
          <span class="text-blue-500 cursor-pointer">Click a device for details</span>
        </div>
      </div>
    `;
    
    return html;
  };

  // Handle refreshing the map view
  const handleRefreshMap = () => {
    if (mapRef.current && markerClusterGroupRef.current) {
      mapRef.current.fitBounds(markerClusterGroupRef.current.getBounds(), {
        padding: [50, 50],
        maxZoom: 14
      });
    }
  };

  // Get unique device types for filter dropdown
  const deviceTypes = Array.from(new Set(devices.map(device => device.type)));
  
  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4299E1]"></div>
      </div>
    );
  }

  // Stats for the summary cards
  const locationStats = devices.reduce((acc: Record<string, number>, device) => {
    acc[device.location] = (acc[device.location] || 0) + 1;
    return acc;
  }, {});

  const statusStats = devices.reduce((acc: Record<string, number>, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {});

  const typeStats = devices.reduce((acc: Record<string, number>, device) => {
    acc[device.type] = (acc[device.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-[#F7FAFC]">
      <div className="bg-white rounded-md shadow-sm mb-4">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-[#4299E1]" />
            <h2 className="text-lg font-medium text-[#2D3748]">Asset Location Map</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Filter Controls */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Device Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {deviceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* View Controls */}
            <div className="flex items-center space-x-3 border-l border-gray-200 pl-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshMap}
                className="h-8"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
              
              <Select value={mapMode} onValueChange={setMapMode}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="streets">Streets</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="cluster-mode" className="text-sm cursor-pointer">
                  Cluster
                </Label>
                <Switch 
                  id="cluster-mode" 
                  checked={clusterMode} 
                  onCheckedChange={setClusterMode} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {/* Main Map View */}
        <div className="col-span-3">
          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <div id="mapContainer" className="w-full" style={{ height: '680px' }}></div>
          </div>
        </div>
        
        {/* Side Stats Panel */}
        <div className="col-span-1 space-y-4">
          {/* Selected Device Details */}
          {selectedDevice && (
            <div className="bg-white rounded-md shadow-sm p-4 border-l-4 border-[#4299E1]">
              <h3 className="text-base font-semibold mb-2 text-[#2D3748]">Selected Device</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Name:</span>
                  <span className="text-sm font-medium">{selectedDevice.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Model:</span>
                  <span className="text-sm">{selectedDevice.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Type:</span>
                  <span className="text-sm">{selectedDevice.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className={cn(
                    "text-sm px-2 py-0.5 rounded-full",
                    selectedDevice.status === "Active" ? "bg-green-100 text-green-800" :
                    selectedDevice.status === "Inactive" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  )}>
                    {selectedDevice.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Location:</span>
                  <span className="text-sm">{selectedDevice.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">IP Address:</span>
                  <span className="text-sm">{selectedDevice.ipAddress || 'N/A'}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => setSelectedDevice(null)}
              >
                Clear Selection
              </Button>
            </div>
          )}
        
          {/* Status Summary */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center text-[#2D3748]">
              <List className="h-4 w-4 mr-2 text-[#4299E1]" />
              Status Summary
            </h3>
            <div className="space-y-3">
              {Object.entries(statusStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={cn(
                      "h-3 w-3 rounded-full mr-2",
                      status === "Active" ? "bg-green-500" :
                      status === "Inactive" ? "bg-red-500" :
                      "bg-yellow-500"
                    )}></span>
                    <span className="text-sm">{status}</span>
                  </div>
                  <span className="text-sm font-medium">{count} devices</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Location Summary */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center text-[#2D3748]">
              <MapPin className="h-4 w-4 mr-2 text-[#4299E1]" />
              Locations
            </h3>
            <div className="space-y-3">
              {Object.entries(locationStats).map(([location, count]) => (
                <div key={location} className="flex items-center justify-between">
                  <span className="text-sm">{location}</span>
                  <span className="text-sm font-medium">{count} devices</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Device Type Summary */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center text-[#2D3748]">
              <List className="h-4 w-4 mr-2 text-[#4299E1]" />
              Device Types
            </h3>
            <div className="space-y-3">
              {Object.entries(typeStats).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">{type}</span>
                  <span className="text-sm font-medium">{count} devices</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
