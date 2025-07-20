import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
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
  Camera,
  Activity,
  Globe
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const markersRef = useRef<L.Marker[]>([]);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerClusterGroupRef = useRef<L.FeatureGroup | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [mapMode, setMapMode] = useState<string>('streets');
  const [clusterMode] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  let timer: NodeJS.Timeout;
  
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Simple function to get map preferences
  const getMapPreferences = () => {
    try {
      const preferences = localStorage.getItem('mapPreferences');
      if (preferences) {
        return JSON.parse(preferences);
      }
    } catch (e) {
      console.error("Error loading map preferences:", e);
    }
    
    // Default preferences if none found
    return {
      defaultZoom: 2, // World view
      showInactiveDevices: true,
      enableSatelliteView: false,
      autoFocusOnSelection: true
    };
  };
  
  const mapPreferences = getMapPreferences();
  
  // Initialize map
  useEffect(() => {
    // Create map only if it doesn't exist yet
    if (!mapRef.current) {
      console.log("Creating new map");
      
      // Get initial zoom from preferences or default to 2 (world view)
      const initialZoom = parseInt(mapPreferences.defaultZoom) || 2;
      
      // Create the map
      mapRef.current = L.map('mapContainer', {
        center: [20, 0], // Center on world view
        zoom: initialZoom,
        zoomControl: false
      });
      
      // Add zoom controls
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
      
      // Determine map style
      const usesSatellite = mapPreferences.enableSatelliteView || mapPreferences.satelliteView;
      setMapMode(usesSatellite ? 'satellite' : 'streets');
      
      // Add appropriate base layer
      if (usesSatellite) {
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(mapRef.current);
      } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);
      }
      
      // Create a layer group to manage the markers
      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
      
      console.log("Map created successfully");
    }

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
    
    // Get map preferences again to make sure we have latest
    const preferences = getMapPreferences();
    
    // Apply show inactive devices preference
    const showInactive = preferences.showInactiveDevices !== false;
    
    // Filter devices based on selected filters and preferences
    const filteredDevices = devices.filter(device => {
      const statusMatch = statusFilter === 'all' || device.status === statusFilter;
      const typeMatch = typeFilter === 'all' || device.type === typeFilter;
      const inactiveCheck = showInactive || device.status !== 'Inactive';
      return statusMatch && typeMatch && inactiveCheck && device.latitude && device.longitude;
    });
    
    // Clear all existing markers from the map
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });
    
    // Reset the marker cluster group
    if (markerClusterGroupRef.current) {
      markerClusterGroupRef.current.clearLayers();
      if (mapRef.current.hasLayer(markerClusterGroupRef.current)) {
        mapRef.current.removeLayer(markerClusterGroupRef.current);
      }
    }
    
    // Create a new marker group
    markerClusterGroupRef.current = L.featureGroup().addTo(mapRef.current);
    
    // Create markers
    const markers: L.Marker[] = [];
    
    console.log("Adding markers for devices:", filteredDevices.length);
    
    try {
      // Process each device to create markers
      filteredDevices.forEach(device => {
        if (device.latitude && device.longitude) {
          const latitude = parseFloat(device.latitude);
          const longitude = parseFloat(device.longitude);
          
          // Skip invalid coordinates
          if (isNaN(latitude) || isNaN(longitude)) {
            console.log("Invalid coordinates for device:", device.name);
            return;
          }
          
          const position = L.latLng(latitude, longitude);
          const marker = L.marker(position, { 
            icon: createMarkerIcon(device) 
          });
          
          // Add popup and tooltip with custom options
          marker.bindPopup(createDevicePopup(device), {
                  maxWidth: 350,
                  minWidth: 280,
                  className: 'custom-device-popup',
                  closeButton: true,
                  autoPan: true
                })
                .on('click', () => {
                  setSelectedDevice(device);
                  
                  // If auto-focus on selection is enabled, zoom to the marker
                  if (preferences.autoFocusOnSelection) {
                    mapRef.current?.setView(position, 14);
                  }
                })
                .bindTooltip(`${device.name} - ${device.status}`, {
                  direction: 'top',
                  offset: L.point(0, -30)
                });
          
          // Add marker directly to the map
          marker.addTo(mapRef.current!);
          
          markers.push(marker);
          
          // Also add to feature group for bounds calculation
          markerClusterGroupRef.current.addLayer(marker);
          
          console.log("Added marker for device:", device.name, "at", latitude, longitude);
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
            
            marker.bindPopup(createDevicePopup(device), {
                    maxWidth: 350,
                    minWidth: 280,
                    className: 'custom-device-popup',
                    closeButton: true,
                    autoPan: true
                  })
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
            
            clusterMarker.bindPopup(createPopupContent(devices), {
                           maxWidth: 400,
                           minWidth: 320,
                           className: 'custom-cluster-popup',
                           closeButton: true,
                           autoPan: true
                         })
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
      device.status === 'Active' ? 'background: linear-gradient(135deg, #10B981, #059669); color: white;' : 
      device.status === 'Inactive' ? 'background: linear-gradient(135deg, #EF4444, #DC2626); color: white;' : 
      'background: linear-gradient(135deg, #F59E0B, #D97706); color: white;';
    
    const statusIcon = 
      device.status === 'Active' ? '●' : 
      device.status === 'Inactive' ? '●' : 
      '●';
    
    return `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        width: 260px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        border: none;
        overflow: hidden;
      ">
        <!-- Header with Status -->
        <div style="
          ${statusClass}
          padding: 12px 16px;
          text-align: center;
        ">
          <div style="
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 2px;
          ">${device.name}</div>
          <div style="
            font-size: 11px;
            opacity: 0.9;
          ">${statusIcon} ${device.status}</div>
        </div>
        
        <!-- Content -->
        <div style="padding: 16px;">
          <div style="margin-bottom: 12px;">
            <div style="
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 2px;
            ">Device Model</div>
            <div style="
              font-size: 14px;
              font-weight: 500;
              color: #1f2937;
            ">${device.model}</div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <div style="
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 2px;
            ">Type</div>
            <div style="
              font-size: 14px;
              font-weight: 500;
              color: #1f2937;
            ">${device.type}</div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <div style="
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 2px;
            ">Location</div>
            <div style="
              font-size: 14px;
              font-weight: 500;
              color: #1f2937;
            ">${device.location}</div>
          </div>
          
          <div style="margin-bottom: 0;">
            <div style="
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 2px;
            ">IP Address</div>
            <div style="
              font-size: 13px;
              font-weight: 500;
              color: #1f2937;
              font-family: 'Courier New', monospace;
              background: #f8fafc;
              padding: 6px 8px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            ">${device.ipAddress || 'N/A'}</div>
          </div>
        </div>
      </div>
    `;
  };

  // Create HTML content for popup for a group of devices
  const createPopupContent = (devices: Device[]) => {
    const locationName = devices[0]?.location || 'Unknown';
    
    const html = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        border: none;
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #3B82F6, #2563EB);
          color: white;
          padding: 12px 16px;
          text-align: center;
        ">
          <div style="
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 2px;
          ">📍 ${locationName}</div>
          <div style="
            font-size: 11px;
            opacity: 0.9;
          ">${devices.length} device${devices.length !== 1 ? 's' : ''}</div>
        </div>
        
        <!-- Device List -->
        <div style="
          max-height: 180px; 
          overflow-y: auto;
          padding: 12px;
        ">
          ${devices.map((device, index) => {
            const statusColor = 
              device.status === 'Active' ? '#10B981' : 
              device.status === 'Inactive' ? '#EF4444' : 
              '#F59E0B';
            
            return `
              <div style="
                padding: 8px 0;
                ${index < devices.length - 1 ? 'border-bottom: 1px solid #f1f5f9;' : ''}
              ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="
                      font-size: 13px;
                      font-weight: 500;
                      color: #1f2937;
                      margin-bottom: 2px;
                    ">${device.name}</div>
                    <div style="
                      font-size: 11px;
                      color: #6b7280;
                    ">${device.type}</div>
                  </div>
                  <div style="
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: ${statusColor};
                  "></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    return html;
  };

  // Handle refreshing the map view
  const handleRefreshMap = () => {
    if (mapRef.current) {
      // Get all markers (regardless of clustering)
      const deviceMarkers = devices
        .filter(device => device.latitude && device.longitude)
        .map(device => {
          if (device.latitude && device.longitude) {
            const latitude = parseFloat(device.latitude);
            const longitude = parseFloat(device.longitude);
            if (!isNaN(latitude) && !isNaN(longitude)) {
              return L.latLng(latitude, longitude);
            }
          }
          return null;
        })
        .filter((latlng): latlng is L.LatLng => latlng !== null);
      
      if (deviceMarkers.length > 0) {
        // Create bounds from all device markers
        const bounds = L.latLngBounds(deviceMarkers);
        mapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13
        });
      } else {
        // If no markers, set default view (world view)
        mapRef.current.setView([20, 0], 2);
      }
      
      // Force reload data and redraw markers
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    }
  };

  // Get unique device types for filter dropdown (filter out Unknown devices)
  const deviceTypes = Array.from(new Set(devices.filter(device => device.type !== 'Unknown').map(device => device.type)));
  
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
    if (device.type !== 'Unknown') {
      acc[device.type] = (acc[device.type] || 0) + 1;
    }
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
              
              {/* Cluster toggle removed - all markers always visible */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for popup styling */}
      <style>{`
        .custom-device-popup .leaflet-popup-content-wrapper,
        .custom-cluster-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          border: none !important;
        }
        .custom-device-popup .leaflet-popup-content,
        .custom-cluster-popup .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          width: auto !important;
          line-height: 1 !important;
        }
        .custom-device-popup .leaflet-popup-tip,
        .custom-cluster-popup .leaflet-popup-tip {
          background: white !important;
          border: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }
        .leaflet-popup-close-button {
          background: rgba(0, 0, 0, 0.1) !important;
          color: #666 !important;
          border-radius: 50% !important;
          width: 24px !important;
          height: 24px !important;
          font-size: 16px !important;
          right: 8px !important;
          top: 8px !important;
          padding: 0 !important;
          text-align: center !important;
          line-height: 22px !important;
          border: none !important;
        }
        .leaflet-popup-close-button:hover {
          background: rgba(0, 0, 0, 0.2) !important;
          color: #333 !important;
        }
      `}</style>
      
      <div className="grid grid-cols-4 gap-4">
        {/* Main Map View */}
        <div className="col-span-3">
          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <div id="mapContainer" className="w-full" style={{ height: '680px' }}></div>
          </div>
        </div>
        
        {/* Side Stats Panel */}
        <div className="col-span-1 space-y-4">
          {/* Your Location */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center text-[#2D3748]">
              <MapPin className="h-4 w-4 mr-2 text-[#4299E1]" />
              Your Location
            </h3>
            <div className="space-y-2">
              {userLocation ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">● Location detected</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <div>Latitude: {userLocation.lat.toFixed(6)}</div>
                    <div>Longitude: {userLocation.lng.toFixed(6)}</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => {
                      if (mapRef.current && userLocation) {
                        mapRef.current.setView([userLocation.lat, userLocation.lng], 15);
                      }
                    }}
                  >
                    Locate Me
                  </Button>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                    Detecting location...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Device Details */}
          {selectedDevice && (
            <div className="bg-white rounded-md shadow-sm p-4 border-l-4 border-[#4299E1]">
              <h3 className="text-base font-semibold mb-3 text-[#2D3748]">Selected Device</h3>
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
                    "text-sm px-2 py-0.5 rounded-full font-medium",
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
                  <span className="text-sm font-mono">{selectedDevice.ipAddress || 'N/A'}</span>
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
          {/* Active Devices */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center text-[#2D3748]">
              <Activity className="h-4 w-4 mr-2 text-[#4299E1]" />
              Active Devices
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {devices
                .filter(device => device.status === 'Active')
                .slice(0, 5)
                .map((device, index) => (
                <div key={device.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{device.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{device.type}</span>
                </div>
              ))}
              {devices.filter(device => device.status === 'Active').length === 0 && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No active devices
                </div>
              )}
            </div>
          </div>
        
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
              <Globe className="h-4 w-4 mr-2 text-[#4299E1]" />
              Locations
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(locationStats)
                .sort(([,a], [,b]) => b - a)
                .map(([location, count]) => (
                <div key={location} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">{location}</span>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Device Type Summary - Sequential List */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center text-[#2D3748]">
              <List className="h-4 w-4 mr-2 text-[#4299E1]" />
              Device Types
            </h3>
            <div className="space-y-1">
              {Object.entries(typeStats)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count], index) => (
                  <div key={type} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
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
