import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, Shield, CheckCircle, AlertTriangle } from "lucide-react";

interface AutoScanNotificationProps {
  deviceName: string;
  isScanning: boolean;
  scanComplete: boolean;
  detectedCount?: number;
  onClose: () => void;
}

export function AutoScanNotification({ 
  deviceName, 
  isScanning, 
  scanComplete, 
  detectedCount = 0,
  onClose 
}: AutoScanNotificationProps) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 150);
      
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  useEffect(() => {
    if (scanComplete) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [scanComplete, onClose]);

  if (!isScanning && !scanComplete) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm">
            {isScanning ? (
              <>
                <Wifi className="h-4 w-4 mr-2 text-blue-600 animate-pulse" />
                Device Detected on Network
              </>
            ) : (
              <>
                {detectedCount > 0 ? (
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                )}
                Scan Complete
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{deviceName}</span>
            <Badge variant="outline" className="text-xs">
              {isScanning ? "Scanning..." : "Complete"}
            </Badge>
          </div>
          
          {isScanning && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <Shield className="h-3 w-3 mr-1" />
                Checking for prohibited software...
              </div>
            </>
          )}
          
          {scanComplete && (
            <div className="flex items-center justify-between text-sm">
              <span>Threats detected:</span>
              <Badge className={detectedCount > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                {detectedCount}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}