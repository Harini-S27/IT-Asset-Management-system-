import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Device } from '@shared/schema';

// Manually fix the marker icon issue with Leaflet in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapComponent = () => {
  const mapRef = useRef<L.Map | null>(null);
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([37.7749, -122.4194], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add device markers to map
  useEffect(() => {
    if (mapRef.current && devices.length > 0) {
      // Clear existing markers
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          mapRef.current?.removeLayer(layer);
        }
      });

      // Group devices by location
      const locationGroups: Record<string, Device[]> = {};
      devices.forEach(device => {
        if (device.latitude && device.longitude) {
          const key = `${device.latitude}-${device.longitude}`;
          if (!locationGroups[key]) {
            locationGroups[key] = [];
          }
          locationGroups[key].push(device);
        }
      });

      // Add markers for each location
      const bounds = L.latLngBounds([]);
      
      Object.entries(locationGroups).forEach(([key, devicesAtLocation]) => {
        const [lat, lng] = key.split('-');
        const position = L.latLng(parseFloat(lat), parseFloat(lng));
        
        // Create marker with custom icon based on location
        const marker = L.marker(position)
          .bindPopup(createPopupContent(devicesAtLocation))
          .addTo(mapRef.current!);
        
        bounds.extend(position);
      });

      // Adjust map view to show all markers
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [devices]);

  // Create HTML content for popup
  const createPopupContent = (devices: Device[]) => {
    const locationName = devices[0]?.location || 'Unknown';
    
    const html = `
      <div class="map-popup">
        <h3 class="text-base font-semibold mb-2">${locationName}</h3>
        <p class="text-sm mb-2">${devices.length} device${devices.length !== 1 ? 's' : ''}</p>
        <ul class="text-xs max-h-40 overflow-y-auto">
          ${devices.map(device => `
            <li class="py-1 border-b border-gray-100">
              <div class="font-medium">${device.name}</div>
              <div class="text-gray-500">${device.type} - ${device.model}</div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
    
    return html;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading map data...</div>;
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
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">Asset Location Map</h2>
        <p className="text-sm text-gray-500">View the geographical distribution of all your IT assets</p>
      </div>
      
      <div id="map" className="w-full" style={{ height: '600px' }}></div>
      
      <div className="p-4 border-t border-gray-200 flex flex-wrap gap-4">
        {/* Location Summary */}
        <div className="bg-gray-100 rounded-md p-3 w-64">
          <h3 className="text-sm font-medium mb-2">Device Locations</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(locationStats).map(([location, count]) => (
              <div key={location} className="flex items-center justify-between">
                <span>{location}</span>
                <span className="font-medium">{count} devices</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Status Summary */}
        <div className="bg-gray-100 rounded-md p-3 w-64">
          <h3 className="text-sm font-medium mb-2">Status Summary</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(statusStats).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="flex items-center">
                  <span className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(status)}`}></span>
                  {status}
                </span>
                <span className="font-medium">{count} devices</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Device Type Summary */}
        <div className="bg-gray-100 rounded-md p-3 w-64">
          <h3 className="text-sm font-medium mb-2">Device Types</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(typeStats).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span>{type}</span>
                <span className="font-medium">{count} devices</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-green-500';
    case 'Inactive':
      return 'bg-red-500';
    case 'Maintenance':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

export default MapComponent;
