import React from "react";
import MapView from "@/components/map/map-view-new"; // Using the new map component

const MapPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Asset Location Map</h1>
          <p className="text-gray-500">View the geographical distribution of all your IT assets</p>
        </div>
      </div>

      <MapView />
    </div>
  );
};

export default MapPage;
