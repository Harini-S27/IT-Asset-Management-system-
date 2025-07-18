import { storage } from './storage';
import { Device } from '@shared/schema';

export class WarrantyService {
  // Manufacturer warranty check APIs (would need API keys in production)
  private static readonly MANUFACTURER_APIS = {
    'Dell': 'https://api.dell.com/warranty',
    'HP': 'https://api.hp.com/warranty',
    'Lenovo': 'https://api.lenovo.com/warranty',
    'Apple': 'https://api.apple.com/warranty',
    'Microsoft': 'https://api.microsoft.com/warranty'
  };

  // Simulate warranty detection based on device model and serial number
  static async detectWarrantyInfo(device: Device): Promise<{
    warrantyEndDate?: Date;
    warrantyType?: string;
    warrantyProvider?: string;
    manufacturer?: string;
    autoDetected: boolean;
  }> {
    try {
      // In a real implementation, this would:
      // 1. Extract manufacturer from device model
      // 2. Use serial number to query manufacturer APIs
      // 3. Parse warranty information from API responses
      
      const manufacturer = this.extractManufacturer(device.model);
      
      if (!manufacturer || !device.serialNumber) {
        return { autoDetected: false };
      }

      // Simulate API call to manufacturer warranty service
      const warrantyInfo = await this.queryManufacturerAPI(manufacturer, device.serialNumber, device.model);
      
      return {
        ...warrantyInfo,
        manufacturer,
        autoDetected: true
      };
    } catch (error) {
      console.error('Error detecting warranty info:', error);
      return { autoDetected: false };
    }
  }

  // Extract manufacturer from device model
  private static extractManufacturer(model: string): string | null {
    const modelLower = model.toLowerCase();
    
    if (modelLower.includes('dell')) return 'Dell';
    if (modelLower.includes('hp') || modelLower.includes('hewlett')) return 'HP';
    if (modelLower.includes('lenovo')) return 'Lenovo';
    if (modelLower.includes('apple') || modelLower.includes('macbook') || modelLower.includes('imac')) return 'Apple';
    if (modelLower.includes('microsoft') || modelLower.includes('surface')) return 'Microsoft';
    if (modelLower.includes('asus')) return 'ASUS';
    if (modelLower.includes('acer')) return 'Acer';
    if (modelLower.includes('samsung')) return 'Samsung';
    if (modelLower.includes('lg')) return 'LG';
    if (modelLower.includes('sony')) return 'Sony';
    
    return null;
  }

  // Simulate manufacturer API call
  private static async queryManufacturerAPI(manufacturer: string, serialNumber: string, model: string): Promise<{
    warrantyEndDate?: Date;
    warrantyType?: string;
    warrantyProvider?: string;
  }> {
    // In production, this would make actual API calls to manufacturer services
    // For now, we'll simulate realistic warranty information
    
    const now = new Date();
    const purchaseDate = new Date(now.getTime() - (Math.random() * 365 * 2 * 24 * 60 * 60 * 1000)); // Random date within last 2 years
    const warrantyPeriod = manufacturer === 'Apple' ? 365 : 1095; // Apple: 1 year, others: 3 years
    const warrantyEndDate = new Date(purchaseDate.getTime() + (warrantyPeriod * 24 * 60 * 60 * 1000));
    
    // Only return warranty info if it hasn't expired
    if (warrantyEndDate > now) {
      return {
        warrantyEndDate,
        warrantyType: manufacturer === 'Apple' ? 'Limited Warranty' : 'Standard Warranty',
        warrantyProvider: 'Manufacturer'
      };
    }
    
    return {};
  }

  // Update device warranty information
  static async updateDeviceWarranty(deviceId: number, warrantyData: {
    serialNumber?: string;
    assetTag?: string;
    manufacturer?: string;
    purchaseDate?: Date;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
    warrantyType?: string;
    warrantyProvider?: string;
    cost?: string;
    supplier?: string;
    owner?: string;
    department?: string;
    endOfLifeDate?: Date;
    nextMaintenanceDate?: Date;
    lastMaintenanceDate?: Date;
    warrantyAutoDetected?: boolean;
  }): Promise<void> {
    try {
      await storage.updateDeviceWarranty(deviceId, {
        ...warrantyData,
        warrantyLastChecked: new Date()
      });
    } catch (error) {
      console.error('Error updating device warranty:', error);
      throw error;
    }
  }

  // Check warranty expiration for all devices and create alerts
  static async checkWarrantyExpirations(): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      for (const device of devices) {
        if (device.warrantyEndDate) {
          const warrantyEndDate = new Date(device.warrantyEndDate);
          
          // Check if warranty expires within 30 days
          if (warrantyEndDate <= thirtyDaysFromNow && warrantyEndDate > new Date()) {
            const existingAlerts = await storage.getAlerts();
            const hasExistingAlert = existingAlerts.some(alert => 
              alert.deviceId === device.id && 
              alert.alertType === 'warranty_expiration' && 
              alert.status === 'Active'
            );

            if (!hasExistingAlert) {
              await storage.createAlert({
                deviceId: device.id,
                alertType: 'warranty_expiration',
                alertTitle: 'Warranty Expiring Soon',
                alertDescription: `Device warranty expires on ${warrantyEndDate.toLocaleDateString()}`,
                severity: 'Medium',
                alertDate: new Date(),
                warrantyExpirationDate: warrantyEndDate,
                assignedTo: 'IT Team',
                status: 'Active'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking warranty expirations:', error);
    }
  }

  // Bulk import warranty data from CSV
  static async importWarrantyData(csvData: Array<{
    deviceName: string;
    serialNumber?: string;
    assetTag?: string;
    manufacturer?: string;
    purchaseDate?: string;
    warrantyEndDate?: string;
    warrantyType?: string;
    cost?: string;
    supplier?: string;
    owner?: string;
    department?: string;
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of csvData) {
      try {
        const device = await storage.getDeviceByName(row.deviceName);
        if (!device) {
          errors.push(`Device not found: ${row.deviceName}`);
          failed++;
          continue;
        }

        const warrantyData = {
          serialNumber: row.serialNumber,
          assetTag: row.assetTag,
          manufacturer: row.manufacturer,
          purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
          warrantyEndDate: row.warrantyEndDate ? new Date(row.warrantyEndDate) : undefined,
          warrantyType: row.warrantyType,
          cost: row.cost,
          supplier: row.supplier,
          owner: row.owner,
          department: row.department,
          warrantyAutoDetected: false
        };

        await this.updateDeviceWarranty(device.id, warrantyData);
        success++;
      } catch (error) {
        errors.push(`Error processing ${row.deviceName}: ${error}`);
        failed++;
      }
    }

    return { success, failed, errors };
  }
}