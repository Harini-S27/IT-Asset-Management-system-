import { storage } from './storage';
import { WarrantyService } from './warranty-service';

export class AlertScheduler {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  // Start automatic alert checking every 24 hours
  static startScheduler(): void {
    if (this.isRunning) return;

    console.log('🚨 Starting Alert Scheduler - checking every 24 hours');
    this.isRunning = true;

    // Run immediately on startup
    this.runScheduledChecks();

    // Run every 24 hours (86400000 milliseconds)
    this.intervalId = setInterval(() => {
      this.runScheduledChecks();
    }, 86400000);
  }

  // Stop the scheduler
  static stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🚨 Alert Scheduler stopped');
  }

  // Run all scheduled alert checks
  private static async runScheduledChecks(): Promise<void> {
    try {
      console.log('🔍 Running scheduled alert checks...');
      
      // Check warranty expirations
      await this.checkWarrantyExpirations();
      
      // Check end-of-life dates
      await this.checkEndOfLifeDates();
      
      // Check maintenance due dates
      await this.checkMaintenanceDueDates();
      
      // Check for overdue maintenance
      await this.checkOverdueMaintenanceAlerts();
      
      console.log('✅ Scheduled alert checks completed');
    } catch (error) {
      console.error('❌ Error in scheduled alert checks:', error);
    }
  }

  // Check warranty expiration dates and create alerts
  private static async checkWarrantyExpirations(): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const now = new Date();
      
      for (const device of devices) {
        if (device.warrantyEndDate) {
          const warrantyEndDate = new Date(device.warrantyEndDate);
          const daysUntilExpiration = Math.ceil((warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Create alerts at different intervals
          const alertDays = [30, 14, 7, 3, 1]; // Days before expiration
          
          for (const alertDay of alertDays) {
            if (daysUntilExpiration === alertDay) {
              await this.createWarrantyAlert(device, warrantyEndDate, alertDay);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking warranty expirations:', error);
    }
  }

  // Check end-of-life dates and create alerts
  private static async checkEndOfLifeDates(): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const now = new Date();
      
      for (const device of devices) {
        if (device.endOfLifeDate) {
          const endOfLifeDate = new Date(device.endOfLifeDate);
          const daysUntilEOL = Math.ceil((endOfLifeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Create alerts at different intervals
          const alertDays = [180, 90, 60, 30, 7]; // Days before end of life
          
          for (const alertDay of alertDays) {
            if (daysUntilEOL === alertDay) {
              await this.createEndOfLifeAlert(device, endOfLifeDate, alertDay);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking end-of-life dates:', error);
    }
  }

  // Check maintenance due dates and create alerts
  private static async checkMaintenanceDueDates(): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const now = new Date();
      
      for (const device of devices) {
        if (device.nextMaintenanceDate) {
          const maintenanceDate = new Date(device.nextMaintenanceDate);
          const daysUntilMaintenance = Math.ceil((maintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Create alerts at different intervals
          const alertDays = [14, 7, 3, 1]; // Days before maintenance
          
          for (const alertDay of alertDays) {
            if (daysUntilMaintenance === alertDay) {
              await this.createMaintenanceAlert(device, maintenanceDate, alertDay);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking maintenance due dates:', error);
    }
  }

  // Check for overdue maintenance and create alerts
  private static async checkOverdueMaintenanceAlerts(): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const now = new Date();
      
      for (const device of devices) {
        if (device.nextMaintenanceDate) {
          const maintenanceDate = new Date(device.nextMaintenanceDate);
          const daysOverdue = Math.ceil((now.getTime() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Create overdue alerts
          if (daysOverdue > 0) {
            await this.createOverdueMaintenanceAlert(device, daysOverdue);
          }
        }
      }
    } catch (error) {
      console.error('Error checking overdue maintenance:', error);
    }
  }

  // Create warranty expiration alert
  private static async createWarrantyAlert(device: any, warrantyEndDate: Date, daysUntilExpiration: number): Promise<void> {
    try {
      // Check if alert already exists
      const existingAlerts = await storage.getAlerts();
      const hasExistingAlert = existingAlerts.some(alert => 
        alert.deviceId === device.id && 
        alert.alertType === 'warranty_expiration' && 
        alert.status === 'Active'
      );

      if (!hasExistingAlert) {
        let severity = 'Low';
        if (daysUntilExpiration <= 7) severity = 'Critical';
        else if (daysUntilExpiration <= 14) severity = 'High';
        else if (daysUntilExpiration <= 30) severity = 'Medium';

        await storage.createAlert({
          deviceId: device.id,
          alertType: 'warranty_expiration',
          alertTitle: `WARRANTY EXPIRES IN ${daysUntilExpiration} DAYS`,
          alertDescription: `Device warranty expires on ${warrantyEndDate.toLocaleDateString()}. Action required to renew or replace.`,
          severity: severity as 'Low' | 'Medium' | 'High' | 'Critical',
          alertDate: new Date(),
          warrantyExpirationDate: warrantyEndDate,
          assignedTo: 'IT Manager',
          status: 'Active',
          isRecurring: daysUntilExpiration > 7,
          recurringInterval: 7,
          tags: ['auto-generated', 'warranty', 'expiring']
        });

        console.log(`📅 Created warranty alert for device ${device.name}: ${daysUntilExpiration} days remaining`);
      }
    } catch (error) {
      console.error('Error creating warranty alert:', error);
    }
  }

  // Create end-of-life alert
  private static async createEndOfLifeAlert(device: any, endOfLifeDate: Date, daysUntilEOL: number): Promise<void> {
    try {
      const existingAlerts = await storage.getAlerts();
      const hasExistingAlert = existingAlerts.some(alert => 
        alert.deviceId === device.id && 
        alert.alertType === 'end_of_life' && 
        alert.status === 'Active'
      );

      if (!hasExistingAlert) {
        let severity = 'Low';
        if (daysUntilEOL <= 30) severity = 'Critical';
        else if (daysUntilEOL <= 90) severity = 'High';
        else if (daysUntilEOL <= 180) severity = 'Medium';

        await storage.createAlert({
          deviceId: device.id,
          alertType: 'end_of_life',
          alertTitle: `END OF LIFE IN ${daysUntilEOL} DAYS`,
          alertDescription: `Device reaches end of manufacturer support on ${endOfLifeDate.toLocaleDateString()}. Begin replacement planning.`,
          severity: severity as 'Low' | 'Medium' | 'High' | 'Critical',
          alertDate: new Date(),
          endOfLifeDate: endOfLifeDate,
          assignedTo: 'System Administrator',
          status: 'Active',
          isRecurring: daysUntilEOL > 30,
          recurringInterval: 30,
          tags: ['auto-generated', 'end-of-life', 'replacement-needed']
        });

        console.log(`📅 Created end-of-life alert for device ${device.name}: ${daysUntilEOL} days remaining`);
      }
    } catch (error) {
      console.error('Error creating end-of-life alert:', error);
    }
  }

  // Create maintenance due alert
  private static async createMaintenanceAlert(device: any, maintenanceDate: Date, daysUntilMaintenance: number): Promise<void> {
    try {
      const existingAlerts = await storage.getAlerts();
      const hasExistingAlert = existingAlerts.some(alert => 
        alert.deviceId === device.id && 
        alert.alertType === 'maintenance_due' && 
        alert.status === 'Active'
      );

      if (!hasExistingAlert) {
        let severity = 'Low';
        if (daysUntilMaintenance <= 1) severity = 'Critical';
        else if (daysUntilMaintenance <= 3) severity = 'High';
        else if (daysUntilMaintenance <= 7) severity = 'Medium';

        await storage.createAlert({
          deviceId: device.id,
          alertType: 'maintenance_due',
          alertTitle: `MAINTENANCE DUE IN ${daysUntilMaintenance} DAYS`,
          alertDescription: `Scheduled maintenance required on ${maintenanceDate.toLocaleDateString()}. Contact maintenance team to schedule.`,
          severity: severity as 'Low' | 'Medium' | 'High' | 'Critical',
          alertDate: new Date(),
          maintenanceDueDate: maintenanceDate,
          assignedTo: 'Maintenance Team',
          status: 'Active',
          isRecurring: false,
          tags: ['auto-generated', 'maintenance', 'scheduled']
        });

        console.log(`📅 Created maintenance alert for device ${device.name}: ${daysUntilMaintenance} days until maintenance`);
      }
    } catch (error) {
      console.error('Error creating maintenance alert:', error);
    }
  }

  // Create overdue maintenance alert
  private static async createOverdueMaintenanceAlert(device: any, daysOverdue: number): Promise<void> {
    try {
      const existingAlerts = await storage.getAlerts();
      const hasExistingAlert = existingAlerts.some(alert => 
        alert.deviceId === device.id && 
        alert.alertType === 'maintenance_due' && 
        alert.status === 'Active' &&
        alert.alertDescription?.includes('OVERDUE')
      );

      if (!hasExistingAlert) {
        await storage.createAlert({
          deviceId: device.id,
          alertType: 'maintenance_due',
          alertTitle: `MAINTENANCE OVERDUE - ${daysOverdue} DAYS`,
          alertDescription: `Scheduled maintenance is ${daysOverdue} days overdue. Immediate action required to prevent equipment failure.`,
          severity: 'Critical',
          alertDate: new Date(),
          maintenanceDueDate: new Date(Date.now() - (daysOverdue * 24 * 60 * 60 * 1000)),
          assignedTo: 'Maintenance Team',
          status: 'Active',
          isRecurring: true,
          recurringInterval: 7,
          tags: ['auto-generated', 'maintenance', 'overdue', 'critical']
        });

        console.log(`📅 Created overdue maintenance alert for device ${device.name}: ${daysOverdue} days overdue`);
      }
    } catch (error) {
      console.error('Error creating overdue maintenance alert:', error);
    }
  }

  // Manual trigger for testing
  static async triggerManualCheck(): Promise<void> {
    console.log('🔄 Manual alert check triggered');
    await this.runScheduledChecks();
  }
}