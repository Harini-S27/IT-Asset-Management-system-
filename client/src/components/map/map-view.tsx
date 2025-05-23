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
  List,
  Settings as SettingsIcon
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Define marker icons
const createMarkerIcon = (status: string) => {
  let color = '#48BB78'; // Default green for active (success)
  
  if (status === 'Inactive') {
    color = '#F56565'; // Red for inactive/offline
  } else if (status === 'Maintenance') {
    color = '#ECC94B'; // Yellow for maintenance
  }
  
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px white, 0 0 0 4px rgba(0,0,0,0.15);">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// Create cluster marker icon
const createClusterIcon = (count: number) => {
  return L.divIcon({
    className: 'custom-cluster-icon',
    html: `<div style="background-color: #4299E1; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 0 0 2px white, 0 0 0 4px rgba(0,0,0,0.15);">
            ${count > 99 ? '99+' : count}
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
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
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
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
        
        // Create a layer group for markers
        markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
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

  // Add device markers to map whenever devices, filters, or cluster mode changes
  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current || !devices.length) {
      return;
    }

    // Clear existing markers
    markerLayerRef.current.clearLayers();

    // Filter devices based on selected filters
    const filteredDevices = devices.filter(device => {
      const statusMatch = statusFilter === 'all' || device.status === statusFilter;
      const typeMatch = typeFilter === 'all' || device.type === typeFilter;
      return statusMatch && typeMatch;
    });

    if (clusterMode) {
      // Group devices by location for clustering
      const locationGroups: Record<string, Device[]> = {};
      
      filteredDevices.forEach(device => {
        if (device.latitude && device.longitude) {
          const key = `${device.latitude}-${device.longitude}`;
          if (!locationGroups[key]) {
            locationGroups[key] = [];
          }
          locationGroups[key].push(device);
        }
      });
      
      // Create markers for each location group
      const markers: L.Marker[] = [];
      
      Object.entries(locationGroups).forEach(([key, devicesAtLocation]) => {
        const [lat, lng] = key.split('-').map(coord => parseFloat(coord));
        
        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lng)) return;
        
        // Determine status for marker icon - prioritize active devices
        let markerStatus = 'Inactive';
        if (devicesAtLocation.some(d => d.status === 'Active')) {
          markerStatus = 'Active';
        } else if (devicesAtLocation.some(d => d.status === 'Maintenance')) {
          markerStatus = 'Maintenance';
        }
        
        // Create marker
        const marker = L.marker([lat, lng], {
          icon: devicesAtLocation.length > 1 
            ? createClusterIcon(devicesAtLocation.length) 
            : createMarkerIcon(markerStatus)
        });
        
        // Add popup with device details
        marker.bindPopup(createGroupPopup(devicesAtLocation))
              .on('click', () => {
                if (devicesAtLocation.length === 1) {
                  setSelectedDevice(devicesAtLocation[0]);
                }
              });
        
        markers.push(marker);
      });
      
      // Add markers to map
      markers.forEach(marker => markerLayerRef.current?.addLayer(marker));
      
      // Fit map to show all markers
      if (markers.length > 0 && mapRef.current) {
        const group = L.featureGroup(markers);
        mapRef.current.fitBounds(group.getBounds(), {
          padding: [50, 50],
          maxZoom: 13
        });
      }
    } else {
      // Individual markers mode
      filteredDevices.forEach(device => {
        if (device.latitude && device.longitude) {
          const lat = parseFloat(device.latitude);
          const lng = parseFloat(device.longitude);
          
          // Skip invalid coordinates
          if (isNaN(lat) || isNaN(lng)) return;
          
          // Create marker
          const marker = L.marker([lat, lng], {
            icon: createMarkerIcon(device.status)
          });
          
          // Add popup with device details
          marker.bindPopup(createDevicePopup(device))
                .on('click', () => {
                  setSelectedDevice(device);
                });
          
          markerLayerRef.current?.addLayer(marker);
        }
      });
      
      // Fit map to show all markers
      if (filteredDevices.length > 0 && mapRef.current && markerLayerRef.current) {
        const bounds = markerLayerRef.current.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 13
          });
        }
      }
    }
  }, [devices, statusFilter, typeFilter, clusterMode]);

  // Create HTML content for a single device popup
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

  // Create HTML content for a group of devices popup
  const createGroupPopup = (devices: Device[]) => {
    const locationName = devices[0]?.location || 'Unknown';
    
    return `
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
          <span class="text-blue-500 cursor-pointer">Click for details</span>
        </div>
      </div>
    `;
  };

  // Handle refreshing the map view
  const handleRefreshMap = () => {
    if (mapRef.current && markerLayerRef.current) {
      const bounds = markerLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13
        });
      }
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
                  <SelectValue placeholder="All Statuses" />
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
                  <SelectValue placeholder="All Types" />
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
                  <SelectValue placeholder="Streets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="streets">Streets</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center h-8 border rounded-md px-3 space-x-2 bg-white shadow-sm">
                <Label 
                  htmlFor="cluster-toggle" 
                  className="text-xs font-medium cursor-pointer"
                >
                  Cluster
                </Label>
                <Switch 
                  id="cluster-toggle" 
                  checked={clusterMode} 
                  onCheckedChange={setClusterMode}
                  className="data-[state=checked]:bg-[#4299E1]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-4">
        {/* Left side - Map */}
        <div className="flex-1 bg-white rounded-md shadow-sm overflow-hidden">
          <div id="mapContainer" className="w-full h-[550px]"></div>
        </div>
        
        {/* Right side - Summary & Filters */}
        <div className="w-80 space-y-4">
          {/* Status Summary Card */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <List className="h-4 w-4 mr-2 text-[#4299E1]" />
              Status Summary
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center text-sm">
                  <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                  Active
                </span>
                <span className="text-sm font-medium">{statusStats['Active'] || 0} devices</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-sm">
                  <span className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></span>
                  Maintenance
                </span>
                <span className="text-sm font-medium">{statusStats['Maintenance'] || 0} devices</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-sm">
                  <span className="h-3 w-3 rounded-full bg-red-500 mr-2"></span>
                  Inactive
                </span>
                <span className="text-sm font-medium">{statusStats['Inactive'] || 0} devices</span>
              </div>
            </div>
          </div>
          
          {/* Locations Card */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-[#4299E1]" />
              Locations
            </h3>
            <div className="space-y-2">
              {Object.entries(locationStats).map(([location, count]) => (
                <div key={location} className="flex items-center justify-between">
                  <span className="text-sm">{location}</span>
                  <span className="text-sm font-medium">{count} devices</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Device Types Card */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <SettingsIcon className="h-4 w-4 mr-2 text-[#4299E1]" />
              Device Types
            </h3>
            <div className="space-y-2">
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
      
      {/* Selected Device Details */}
      {selectedDevice && (
        <div className="mt-4 bg-white rounded-md shadow-sm p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium">{selectedDevice.name}</h3>
              <p className="text-sm text-gray-500">{selectedDevice.model}</p>
            </div>
            <span 
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                selectedDevice.status === 'Active' ? 'bg-green-100 text-green-800' : 
                selectedDevice.status === 'Inactive' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              )}
            >
              {selectedDevice.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Type</p>
              <p className="text-sm">{selectedDevice.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Location</p>
              <p className="text-sm">{selectedDevice.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">IP Address</p>
              <p className="text-sm">{selectedDevice.ipAddress || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Updated</p>
              <p className="text-sm">
                {selectedDevice.lastUpdated ? new Date(selectedDevice.lastUpdated).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4" 
            onClick={() => setSelectedDevice(null)}
          >
            Close Details
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapComponent;