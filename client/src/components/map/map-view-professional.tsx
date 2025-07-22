import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Device } from '@shared/schema';
import { 
  MapPin, 
  Locate,
  X,
  Activity,
  Monitor,
  Smartphone,
  Server,
  Router,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Device type icons
const getDeviceTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'server':
      return <Server className="h-4 w-4" />;
    case 'laptop':
    case 'workstation':
      return <Monitor className="h-4 w-4" />;
    case 'mobile':
    case 'phone':
      return <Smartphone className="h-4 w-4" />;
    case 'network device':
    case 'router':
      return <Router className="h-4 w-4" />;
    case 'printer':
      return <Printer className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

// Create marker icon with device type and status color
const createMarkerIcon = (device: Device) => {
  let color = '#22C55E'; // Green for active
  let borderColor = '#16A34A';
  
  if (device.status === 'Inactive') {
    color = '#EF4444'; // Red for inactive
    borderColor = '#DC2626';
  } else if (device.status === 'Maintenance') {
    color = '#F59E0B'; // Yellow for maintenance
    borderColor = '#D97706';
  }
  
  const iconSvg = device.type === 'Server' 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`
    : device.type === 'Mobile'
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg>`;
  
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="position: relative; width: 40px; height: 40px; z-index: 1000;">
        <div style="position: absolute; top: 0; left: 5px; background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid ${borderColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          ${iconSvg}
        </div>
        <div style="position: absolute; bottom: 0; left: 14px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid ${borderColor};"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

// Professional Map View Component
const ProfessionalMapView = () => {
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
  
  // Get devices data
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Get all devices for sidebar (both active and inactive)
  const sidebarDevices = devices.slice(0, 10);

  // Request user's current location
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
          mapRef.current.setView([userLat, userLng], 14);
        }
        
        toast({
          title: "Location detected",
          description: `Your location: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`,
          duration: 3000
        });
      },
      (error) => {
        setLocationStatus('error');
        toast({
          title: "Location Error",
          description: "Could not get your location. Using default Chennai location.",
          variant: "destructive",
          duration: 3000
        });
        
        // Fall back to Chennai location
        if (mapRef.current) {
          mapRef.current.setView([13.0827, 80.2707], 12);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
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
    
    const userLocationIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position: relative; width: 40px; height: 40px;">
          <div style="position: absolute; top: 0; left: 5px; background-color: #3B82F6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #1D4ED8; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div style="position: absolute; bottom: 0; left: 14px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid #1D4ED8;"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
    
    const marker = L.marker([lat, lng], { icon: userLocationIcon });
    marker.bindTooltip("Your Current Location", {
      direction: 'top',
      offset: L.point(0, -30)
    });
    
    marker.addTo(mapRef.current);
    userLocationMarkerRef.current = marker;
  };

  // Create enhanced popup with professional styling
  const createDevicePopup = (device: Device) => {
    const statusColor = device.status === 'Active' ? '#22C55E' : 
                        device.status === 'Inactive' ? '#EF4444' : '#F59E0B';
    
    const popupContent = document.createElement('div');
    popupContent.style.cssText = `
      width: 280px;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      overflow: hidden;
    `;
    
    popupContent.innerHTML = `
      <div style="background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd); color: white; padding: 12px; position: relative;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 16px;">💻</span>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${device.name}</h3>
        </div>
        <p style="margin: 0; font-size: 12px; opacity: 0.9;">${device.model || 'Unknown Model'}</p>
      </div>
      <div style="padding: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          <div>
            <label style="font-weight: 600; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Type</label>
            <p style="margin: 2px 0 0 0; color: #374151;">${device.type}</p>
          </div>
          <div>
            <label style="font-weight: 600; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Status</label>
            <p style="margin: 2px 0 0 0; color: ${statusColor}; font-weight: 500;">${device.status}</p>
          </div>
          <div>
            <label style="font-weight: 600; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Location</label>
            <p style="margin: 2px 0 0 0; color: #374151;">${device.location || 'Auto-Discovered'}</p>
          </div>
          <div>
            <label style="font-weight: 600; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">IP Address</label>
            <p style="margin: 2px 0 0 0; color: #374151; font-family: 'SF Mono', Monaco, monospace;">${device.ipAddress || 'N/A'}</p>
          </div>
        </div>
      </div>
    `;
    
    return popupContent;
  };

  // Add device markers to map
  const addMarkersToMap = () => {
    if (!mapRef.current || !devices.length) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = [];
    
    // Add device markers
    devices.forEach(device => {
      if (device.latitude && device.longitude) {
        const marker = L.marker([parseFloat(device.latitude.toString()), parseFloat(device.longitude.toString())], {
          icon: createMarkerIcon(device)
        });
        
        const popupContent = createDevicePopup(device);
        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: 'device-popup-professional'
        });
        
        marker.bindTooltip(device.name, {
          direction: 'top',
          offset: L.point(0, -30)
        });
        
        // Handle marker click to select device
        marker.on('click', () => {
          setSelectedDevice(device);
        });
        
        if (mapRef.current) {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      }
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('mapContainer', {
        center: [13.0827, 80.2707], // Chennai default
        zoom: 12,
        zoomControl: false
      });
      
      // Add zoom controls
      L.control.zoom({ position: 'topright' }).addTo(map);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      mapRef.current = map;
      
      // Request user location
      setTimeout(() => {
        requestUserLocation();
      }, 1000);
    }
  }, []);

  // Update markers when devices change
  useEffect(() => {
    addMarkersToMap();
  }, [devices]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Map Container */}
      <div className="flex-1 relative">
        <div id="mapContainer" className="w-full h-full" />
        
        {/* Map Controls Overlay */}
        <div className="absolute top-4 left-4 z-[1000] space-y-2">
          <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                Asset Location Map
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
      
      {/* Professional Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
        {/* Your Location Section */}
        <Card className="m-4 mb-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Locate className="h-4 w-4 text-blue-600" />
                Your Location
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={requestUserLocation}
                disabled={locationStatus === 'loading'}
                className="h-7 px-2 text-xs"
              >
                Locate Me
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {userLocation ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Latitude:</span>
                  <span className="font-mono">{userLocation.lat.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longitude:</span>
                  <span className="font-mono">{userLocation.lng.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    Location detected
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {locationStatus === 'loading' && "Detecting location..."}
                {locationStatus === 'error' && "Location unavailable"}
                {locationStatus === 'denied' && "Location access denied"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Device Section */}
        <Card className="mx-4 mb-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-purple-600" />
                Selected Device
              </span>
              {selectedDevice && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedDevice(null)}
                  className="h-7 px-2 text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {selectedDevice ? (
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-sm">{selectedDevice.name}</div>
                  <div className="text-xs text-gray-600">{selectedDevice.model || 'Unknown Vendor Device'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <div className="font-medium">{selectedDevice.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs ml-1",
                        selectedDevice.status === 'Active' && "bg-green-100 text-green-800",
                        selectedDevice.status === 'Inactive' && "bg-red-100 text-red-800",
                        selectedDevice.status === 'Maintenance' && "bg-yellow-100 text-yellow-800"
                      )}
                    >
                      {selectedDevice.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <div className="font-medium">{selectedDevice.location || 'Auto-Discovered'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">IP Address:</span>
                    <div className="font-mono text-xs">{selectedDevice.ipAddress || 'N/A'}</div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full h-8 text-xs"
                  onClick={() => setSelectedDevice(null)}
                >
                  Clear Selection
                </Button>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                Click a device marker to view details
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Status Legend */}
        <Card className="mx-4 mb-4 flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Inactive</span>
              </div>
            </CardTitle>
          </CardHeader>

        </Card>
      </div>
      
      {/* Professional Popup Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .device-popup-professional .leaflet-popup-content-wrapper {
            padding: 0 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          }
          .device-popup-professional .leaflet-popup-content {
            margin: 0 !important;
            line-height: 1.4 !important;
          }
          .device-popup-professional .leaflet-popup-tip {
            background: white !important;
            border: none !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
          }
        `
      }} />
    </div>
  );
};

export default ProfessionalMapView;