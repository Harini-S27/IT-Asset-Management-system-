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
  Server,
  Laptop
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg>`;
  }
};

// Create marker icon with device type and status color
const createMarkerIcon = (device: Device) => {
  let color = '#48BB78'; // Default green for active
  let borderColor = '#38A169'; // Darker green border
  
  if (device.status === 'Inactive') {
    color = '#F56565'; // Red for inactive
    borderColor = '#E53E3E'; // Darker red border
  } else if (device.status === 'Maintenance') {
    color = '#ECC94B'; // Yellow for maintenance
    borderColor = '#D69E2E'; // Darker yellow border
  }
  
  const deviceIcon = getDeviceTypeIcon(device.type);
  
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div style="position: relative; width: 40px; height: 40px; z-index: 1000;">
             <div style="position: absolute; top: 0; left: 5px; background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid ${borderColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
               ${deviceIcon}
             </div>
             <div style="position: absolute; bottom: 0; left: 14px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid ${borderColor};"></div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

// Create popup content for device
const createDevicePopup = (device: Device): string => {
  const statusColor = device.status === 'Active' ? 'bg-green-100 text-green-800' : 
                      device.status === 'Inactive' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800';
  
  return `
    <div class="device-popup">
      <h3 class="text-lg font-semibold mb-2">${device.name}</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <span class="font-medium">Type:</span>
        <span>${device.type}</span>
        
        <span class="font-medium">Model:</span>
        <span>${device.model}</span>
        
        <span class="font-medium">Status:</span>
        <span class="${statusColor} px-2 py-0.5 rounded-full text-xs inline-block">${device.status}</span>
        
        <span class="font-medium">Location:</span>
        <span>${device.location}</span>
        
        <span class="font-medium">IP Address:</span>
        <span>${device.ipAddress || 'N/A'}</span>
      </div>
    </div>
  `;
};

// Main Map Component
const MapView = () => {
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [mapMode, setMapMode] = useState<string>('streets');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
  
  // Get the devices data
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Request user's current location using Geolocation API
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive"
      });
      return;
    }

    setLocationStatus('loading');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        setUserLocation({ lat: userLat, lng: userLng });
        setLocationStatus('success');
        
        // Add user location marker to map
        if (mapRef.current) {
          addUserLocationMarker(userLat, userLng);
          // Center map on user location
          mapRef.current.setView([userLat, userLng], 14);
        }
        
        toast({
          title: "Location detected",
          description: `Your location: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`,
          duration: 5000
        });
      },
      (error) => {
        let errorMessage = "Failed to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus('denied');
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus('error');
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            setLocationStatus('error');
            errorMessage = "Location request timed out.";
            break;
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000
        });
        
        // Fall back to Chennai location
        if (mapRef.current) {
          mapRef.current.setView([13.0827, 80.2707], 12);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Add user location marker
  const addUserLocationMarker = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    
    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      mapRef.current.removeLayer(userLocationMarkerRef.current);
    }
    
    // Create user location icon
    const userLocationIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="position: relative; width: 40px; height: 40px;">
               <div style="position: absolute; top: 0; left: 5px; background-color: #3B82F6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #1D4ED8; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                   <circle cx="12" cy="10" r="3"></circle>
                 </svg>
               </div>
               <div style="position: absolute; bottom: 0; left: 14px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid #1D4ED8;"></div>
             </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
    
    // Create marker
    const marker = L.marker([lat, lng], { icon: userLocationIcon });
    
    // Add popup
    marker.bindPopup(`
      <div class="user-location-popup">
        <h3 class="text-lg font-semibold mb-2">Your Location</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <span class="font-medium">Latitude:</span>
          <span>${lat.toFixed(6)}</span>
          <span class="font-medium">Longitude:</span>
          <span>${lng.toFixed(6)}</span>
          <span class="font-medium">Accuracy:</span>
          <span>High precision</span>
        </div>
      </div>
    `);
    
    // Add tooltip
    marker.bindTooltip("Your Current Location", {
      direction: 'top',
      offset: L.point(0, -30)
    });
    
    // Add to map
    marker.addTo(mapRef.current);
    
    // Store reference
    userLocationMarkerRef.current = marker;
  };
  
  // Get map preferences from localStorage
  const getMapPreferences = () => {
    try {
      const savedPrefs = localStorage.getItem('mapPreferences');
      if (savedPrefs) {
        return JSON.parse(savedPrefs);
      }
    } catch (e) {
      console.error("Error loading map preferences:", e);
    }
    
    // Default preferences
    return {
      defaultZoom: "2",
      showInactiveDevices: true,
      enableSatelliteView: false,
      autoFocus: true
    };
  };
  
  // Initialize map on component mount
  useEffect(() => {
    if (!mapRef.current) {
      console.log("Creating map...");
      
      const prefs = getMapPreferences();
      const zoom = parseInt(prefs.defaultZoom) || 2;
      const usesSatellite = prefs.enableSatelliteView || prefs.satelliteView;
      
      // Create map with initial center (will be updated when user location is found)
      const map = L.map('mapContainer', {
        center: [13.0827, 80.2707], // Chennai, India (default fallback)
        zoom: zoom,
        zoomControl: false
      });
      
      // Add zoom controls
      L.control.zoom({ position: 'topright' }).addTo(map);
      
      // Add the appropriate tile layer
      if (usesSatellite) {
        setMapMode('satellite');
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(map);
      } else {
        setMapMode('streets');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
      }
      
      mapRef.current = map;
      console.log("Map created successfully");
      
      // Automatically request user location when map is created
      setTimeout(() => {
        requestUserLocation();
      }, 1000);
    }
    
    // Listen for map preferences changes
    const handlePrefsChange = () => {
      console.log("Map preferences changed, updating map...");
      const prefs = getMapPreferences();
      
      // Update map style if needed
      const usesSatellite = prefs.enableSatelliteView || prefs.satelliteView;
      if ((usesSatellite && mapMode !== 'satellite') || (!usesSatellite && mapMode !== 'streets')) {
        setMapMode(usesSatellite ? 'satellite' : 'streets');
      }
      
      // Refresh markers to apply any new settings
      addMarkersToMap();
    };
    
    window.addEventListener('mapPreferencesChanged', handlePrefsChange);
    
    return () => {
      window.removeEventListener('mapPreferencesChanged', handlePrefsChange);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Change map layer when mode changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Clear existing tile layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });
    
    // Add new tile layer based on selected mode
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
  
  // Add markers to map when devices data changes or filters change
  useEffect(() => {
    if (devices.length > 0 && mapRef.current) {
      addMarkersToMap();
    }
  }, [devices, statusFilter, typeFilter]);
  
  // Function to add markers to map
  const addMarkersToMap = () => {
    if (!mapRef.current || !devices.length) return;
    
    console.log("Adding markers to map...");
    
    // Get preferences
    const prefs = getMapPreferences();
    const showInactive = prefs.showInactiveDevices !== false;
    
    // Clear all existing markers
    clearMarkers();
    
    // Create new markers array
    const newMarkers: L.Marker[] = [];
    
    // Filter devices based on criteria
    const filteredDevices = devices.filter(device => {
      const statusMatch = statusFilter === 'all' || device.status === statusFilter;
      const typeMatch = typeFilter === 'all' || device.type === typeFilter;
      const inactiveCheck = showInactive || device.status !== 'Inactive';
      return statusMatch && typeMatch && inactiveCheck && device.latitude && device.longitude;
    });
    
    console.log(`Creating ${filteredDevices.length} markers for filtered devices`);
    
    // Add markers for filtered devices
    filteredDevices.forEach(device => {
      if (device.latitude && device.longitude) {
        try {
          const lat = parseFloat(device.latitude);
          const lng = parseFloat(device.longitude);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.log(`Invalid coordinates for device: ${device.name}`);
            return;
          }
          
          // Create marker
          const marker = L.marker([lat, lng], {
            icon: createMarkerIcon(device)
          });
          
          // Add popup
          marker.bindPopup(createDevicePopup(device));
          
          // Add click handler
          marker.on('click', () => {
            setSelectedDevice(device);
            
            // Auto-focus if enabled
            if (prefs.autoFocus) {
              mapRef.current?.setView([lat, lng], 14);
            }
          });
          
          // Add tooltip
          marker.bindTooltip(`${device.name} - ${device.status}`, {
            direction: 'top',
            offset: L.point(0, -30)
          });
          
          // Add to map
          marker.addTo(mapRef.current!);
          
          // Add to markers array
          newMarkers.push(marker);
          
          console.log(`Added marker for ${device.name} at ${lat}, ${lng}`);
        } catch (error) {
          console.error(`Error adding marker for device ${device.name}:`, error);
        }
      }
    });
    
    // Store the new markers
    markersRef.current = newMarkers;
    
    // Fit bounds to show all markers if there are any
    if (newMarkers.length > 0) {
      try {
        const group = L.featureGroup(newMarkers);
        const bounds = group.getBounds();
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
        console.log("Map fitted to bounds of all markers");
      } catch (error) {
        console.error("Error fitting bounds:", error);
        // Default view if bounds fitting fails - Chennai, India
        mapRef.current.setView([13.0827, 80.2707], 12);
      }
    } else {
      // Default view if no markers - Chennai, India
      mapRef.current.setView([13.0827, 80.2707], 12);
    }
  };
  
  // Clear all markers from the map
  const clearMarkers = () => {
    if (!mapRef.current) return;
    
    // Remove each marker from the map
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    
    // Clear the markers array
    markersRef.current = [];
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    if (!mapRef.current) return;
    
    toast({
      title: "Refreshing map",
      description: "Loading latest device data..."
    });
    
    // Force reload devices data
    queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    
    // Refresh markers
    addMarkersToMap();
  };
  
  // Get unique device types for filter
  const deviceTypes = Array.from(new Set(devices.map(device => device.type)));
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-slate-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading map data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <MapPin className="h-5 w-5 text-[#4A5568]" />
              <h2 className="text-lg font-medium">Asset Location Map</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="status-filter" className="text-sm">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="type-filter" className="text-sm">Type:</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {deviceTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
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
          {/* Location Status Panel */}
          <div className="bg-white rounded-md shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Your Location</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={requestUserLocation}
                disabled={locationStatus === 'loading'}
                className="h-8 px-2"
              >
                {locationStatus === 'loading' ? (
                  <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                <span className="ml-1 text-xs">
                  {locationStatus === 'loading' ? 'Finding...' : 'Locate Me'}
                </span>
              </Button>
            </div>
            
            <div className="space-y-2">
              {locationStatus === 'loading' && (
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full"></div>
                    <span>Requesting location access...</span>
                  </div>
                </div>
              )}
              
              {locationStatus === 'success' && userLocation && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">Location detected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-500">Latitude:</span>
                      <div className="text-gray-800">{userLocation.lat.toFixed(6)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Longitude:</span>
                      <div className="text-gray-800">{userLocation.lng.toFixed(6)}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {locationStatus === 'denied' && (
                <div className="text-sm">
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium">Access denied</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Please enable location permissions in your browser to use this feature.
                  </p>
                </div>
              )}
              
              {locationStatus === 'error' && (
                <div className="text-sm">
                  <div className="flex items-center space-x-2 text-orange-600">
                    <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">Location unavailable</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Unable to determine your location. Using default map view.
                  </p>
                </div>
              )}
            </div>
          </div>

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
          
          {/* Active Devices Summary */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-2 flex items-center">
              <Server className="w-4 h-4 mr-1" /> Active Devices
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {devices.filter(d => d.status === 'Active').map(device => (
                <div key={device.id} className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm font-medium">{device.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      📍 {device.location}
                    </div>
                  </div>
                </div>
              ))}
              {devices.filter(d => d.status === 'Active').length === 0 && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No active devices found
                </div>
              )}
            </div>
          </div>
          
          {/* Locations Summary */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-1" /> Locations
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Array.from(new Set(devices.map(device => device.location))).map(location => (
                <div key={location} className="flex items-center justify-between pb-2">
                  <span className="text-sm">{location}</span>
                  <span className="text-sm font-medium">
                    {devices.filter(device => device.location === location).length} devices
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Device Types Summary */}
          <div className="bg-white rounded-md shadow-sm p-4">
            <h3 className="text-base font-semibold mb-2 flex items-center">
              <Laptop className="w-4 h-4 mr-1" /> Device Types
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {deviceTypes.map(type => (
                <div key={type} className="flex items-center justify-between pb-2">
                  <span className="text-sm">{type}</span>
                  <span className="text-sm font-medium">
                    {devices.filter(device => device.type === type).length} devices
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;