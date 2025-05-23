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
  Server,
  Laptop,
  Printer,
  Smartphone,
  Wifi,
  Router,
  HardDrive,
  Monitor,
  Camera
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Get device-specific icon based on type
const getDeviceTypeIcon = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'server':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
    case 'laptop':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"></path></svg>`;
    case 'printer':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`;
    case 'network device':
    case 'router':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"></rect><path d="M17 12v10"></path><path d="M7 12v10"></path><path d="M17 12h-4v2a2 2 0 1 1-4 0v-2H7"></path></svg>`;
    case 'phone':
    case 'mobile':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
    case 'storage':
    case 'disk':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>`;
    case 'monitor':
    case 'display':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    case 'camera':
    case 'security camera':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 19-4-4-4-4-9-9"></path><path d="M20.5 13.5 13 6"></path><path d="M18 2 2 18"></path><path d="m2 2 20 20"></path></svg>`;
    case 'access point':
    case 'wireless':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg>`;
  }
};

// Define enhanced marker icons with device type, name and status
const createMarkerIcon = (device: Device | { status: string; type: string; name: string }) => {
  const status = device.status;
  const type = device.type;
  
  // Status colors - using mostly red for servers/hardware as in the image
  let color = '#E53E3E'; // Red for hardware (servers, routers, etc.)
  let borderColor = '#C53030'; // Darker red border
  let iconColor = 'white'; // White icon inside red circle
  
  // If the device is not hardware/server type, or has a different status, use green
  if (
    (type.toLowerCase() !== 'server' && 
     type.toLowerCase() !== 'router' && 
     type.toLowerCase() !== 'network device') || 
    status === 'Maintenance'
  ) {
    color = '#48BB78'; // Green for other devices
    borderColor = '#38A169'; // Darker green border
  }
  
  // Get device-specific icon
  const deviceIcon = getDeviceTypeIcon(type);
  
  // Creating a marker similar to the image you shared
  return L.divIcon({
    className: 'custom-device-marker',
    html: `<div style="position: relative; width: 40px; height: 60px;">
             <div style="position: absolute; top: 0; left: 0; 
                  background-color: ${color}; 
                  width: 40px; height: 40px; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  border: 2px solid ${borderColor}; 
                  box-shadow: 0 0 8px rgba(0,0,0,0.3);">
               ${deviceIcon}
             </div>
             <div style="position: absolute; 
                  bottom: 0; 
                  left: 13px; 
                  width: 0; 
                  height: 0; 
                  border-left: 7px solid transparent; 
                  border-right: 7px solid transparent; 
                  border-top: 14px solid ${borderColor};">
             </div>
           </div>`,
    iconSize: [40, 60],
    iconAnchor: [20, 60],
    popupAnchor: [0, -60]
  });
};

// Create a separate marker icon function for status only (for backward compatibility)
const createStatusMarkerIcon = (status: string) => {
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
  // Use green for numbered clusters as in the image you shared
  let bgColor = '#48BB78';  // Green for numbered clusters
  let borderColor = '#38A169'; // Darker green border
  
  return L.divIcon({
    className: 'custom-cluster-icon',
    html: `<div style="position: relative; width: 44px; height: 64px;">
             <div style="position: absolute; top: 0; left: 0; 
                  background-color: ${bgColor}; 
                  color: white; 
                  width: 44px; 
                  height: 44px; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  font-weight: bold;
                  font-size: 16px;
                  border: 2px solid ${borderColor}; 
                  box-shadow: 0 0 8px rgba(0,0,0,0.3);">
               ${count > 99 ? '99+' : count}
             </div>
             <div style="position: absolute; 
                  bottom: 0; 
                  left: 15px; 
                  width: 0; 
                  height: 0; 
                  border-left: 7px solid transparent; 
                  border-right: 7px solid transparent; 
                  border-top: 14px solid ${borderColor};">
             </div>
           </div>`,
    iconSize: [44, 64],
    iconAnchor: [22, 64],
    popupAnchor: [0, -64]
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
  const [clusterMode, setClusterMode] = useState<boolean>(false);
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
    
    // Create markers
    const markers: L.Marker[] = [];
    
    try {
      // Always add individual markers regardless of clustering mode
      filteredDevices.forEach(device => {
        if (device.latitude && device.longitude) {
          const latitude = parseFloat(device.latitude);
          const longitude = parseFloat(device.longitude);
          
          // Skip invalid coordinates
          if (isNaN(latitude) || isNaN(longitude)) return;
          
          const position = L.latLng(latitude, longitude);
          const marker = L.marker(position, { 
            icon: createMarkerIcon(device) 
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
      
      // Visual representation changes based on clustering mode
      if (clusterMode) {
        // Find devices at the same location and replace their markers with cluster markers
        const locationMap: Record<string, L.Marker[]> = {};
        
        // First, remove all existing markers (we'll re-add them as clusters)
        markers.length = 0;
        
        // Group devices by location coordinates
        filteredDevices.forEach(device => {
          if (device.latitude && device.longitude) {
            const key = `${device.latitude}-${device.longitude}`;
            if (!locationMap[key]) {
              locationMap[key] = [];
            }
            
            // Create marker for this device
            const latitude = parseFloat(device.latitude);
            const longitude = parseFloat(device.longitude);
            if (isNaN(latitude) || isNaN(longitude)) return;
            
            const position = L.latLng(latitude, longitude);
            const marker = L.marker(position, { 
              icon: createMarkerIcon(device) 
            });
            
            marker.bindPopup(createDevicePopup(device))
                  .on('click', () => {
                    setSelectedDevice(device);
                  });
                  
            locationMap[key].push(marker);
          }
        });
        
        // Now create cluster markers for locations with multiple devices
        Object.entries(locationMap).forEach(([key, markersAtLocation]) => {
          if (markersAtLocation.length > 1) {
            // Create a cluster marker for this location
            const [lat, lng] = key.split('-');
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            if (isNaN(latitude) || isNaN(longitude)) return;
            
            const position = L.latLng(latitude, longitude);
            const devices = filteredDevices.filter(d => 
              d.latitude === lat && d.longitude === lng
            );
            
            // Determine the most important status for the cluster (Active > Maintenance > Inactive)
            let clusterStatus = 'Inactive';
            if (devices.some(d => d.status === 'Maintenance')) {
              clusterStatus = 'Maintenance';
            }
            if (devices.some(d => d.status === 'Active')) {
              clusterStatus = 'Active';
            }
            
            // Create a representative device object for the cluster icon
            let representativeDevice = devices[0];
            if (clusterStatus !== representativeDevice.status) {
              // If the cluster status isn't the same as first device, create a custom object
              representativeDevice = {
                ...representativeDevice,
                status: clusterStatus
              };
            }
            
            const clusterMarker = L.marker(position, { 
              icon: devices.length > 1 ? 
                createClusterIcon(devices.length) : 
                createMarkerIcon(representativeDevice)
            });
            
            clusterMarker.bindPopup(createPopupContent(devices))
                         .on('click', () => {
                           setSelectedDevice(devices[0]);
                         });
            
            markers.push(clusterMarker);
          } else if (markersAtLocation.length === 1) {
            // Just add the single marker
            markers.push(markersAtLocation[0]);
          }
        });
      }
      
      // Add markers to map
      if (markers.length > 0) {
        const featureGroup = L.featureGroup(markers).addTo(mapRef.current);
        markerClusterGroupRef.current = featureGroup;
        
        // Fit the map bounds to show all markers
        // Use a type assertion to fix the TypeScript error
        const bounds = (featureGroup as L.FeatureGroup).getBounds();
        mapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14
        });
      } else {
        console.warn("No markers to add to the map");
      }
    } catch (error) {
      console.error("Error adding markers to map:", error);
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
      // Use a type assertion to fix the TypeScript error
      const bounds = (markerClusterGroupRef.current as L.FeatureGroup).getBounds();
      mapRef.current.fitBounds(bounds, {
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
                  Cluster Markers
                </Label>
                <div className="flex flex-col">
                  <Switch 
                    id="cluster-mode" 
                    checked={clusterMode} 
                    onCheckedChange={setClusterMode} 
                  />
                  <span className="text-xs text-gray-500 mt-0.5">
                    {clusterMode ? 'Group nearby devices' : 'Show all devices'}
                  </span>
                </div>
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
