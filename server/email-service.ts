import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface DeviceEmailData {
  ticketNumber: string;
  deviceName: string;
  deviceModel: string;
  deviceBrand: string;
  issueType: 'damage' | 'inactive' | 'abnormal';
  timestamp: string;
  serialNumber?: string;
}

// Brand to email mapping for device manufacturers
const BRAND_EMAIL_MAPPING: Record<string, string> = {
  'hp': 'support@hp.com',
  'dell': 'support@dell.com',
  'apple': 'support@apple.com',
  'mac': 'support@apple.com',
  'macbook': 'support@apple.com',
  'lenovo': 'support@lenovo.com',
  'asus': 'support@asus.com',
  'acer': 'support@acer.com',
  'microsoft': 'support@microsoft.com',
  'surface': 'support@microsoft.com',
  'samsung': 'support@samsung.com',
  'lg': 'support@lg.com',
  'sony': 'support@sony.com',
  'toshiba': 'support@toshiba.com',
  'fujitsu': 'support@fujitsu.com',
  'huawei': 'support@huawei.com',
  'xiaomi': 'support@mi.com',
  'redmi': 'support@mi.com',
  'mi': 'support@mi.com',
  'intel': 'support@intel.com',
  'cisco': 'support@cisco.com',
  'netgear': 'support@netgear.com',
  'linksys': 'support@linksys.com',
  'tp-link': 'support@tp-link.com',
};

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // For development/testing, we'll use a simple configuration
      // In production, you would use environment variables for SMTP configuration
      if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
        // Production configuration with real SMTP
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
          }
        });
      } else {
        // Development configuration - logs emails instead of sending them
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
      }

      this.isConfigured = !!process.env.SMTP_EMAIL;
      
      if (!this.isConfigured) {
        console.log('📧 Email Service: Running in development mode - emails will be logged instead of sent');
        console.log('📧 To enable real email sending, set SMTP_EMAIL and SMTP_PASSWORD environment variables');
      } else {
        console.log('📧 Email Service: Configured for real email sending');
      }
    } catch (error) {
      console.error('📧 Email Service: Failed to initialize transporter:', error);
      this.isConfigured = false;
    }
  }

  private extractBrandFromModel(model: string): string {
    const modelLower = model.toLowerCase();
    
    // Check for brand matches in the model string
    for (const brand in BRAND_EMAIL_MAPPING) {
      if (modelLower.includes(brand)) {
        return brand;
      }
    }
    
    // Try to extract brand from the beginning of model string
    const firstWord = modelLower.split(' ')[0];
    if (BRAND_EMAIL_MAPPING[firstWord]) {
      return firstWord;
    }
    
    return 'unknown';
  }

  private getBrandEmail(brand: string): string | null {
    const brandLower = brand.toLowerCase();
    return BRAND_EMAIL_MAPPING[brandLower] || null;
  }

  private generateEmailContent(data: DeviceEmailData): { subject: string; html: string; text: string } {
    const issueTypeText = data.issueType === 'damage' ? 'Damaged' : 
                         data.issueType === 'inactive' ? 'Inactive' : 'Abnormal';
    
    const subject = `Device ${issueTypeText} - Support Ticket ${data.ticketNumber}`;
    
    const text = `
Device Support Notification

Ticket ID: ${data.ticketNumber}
Device Name: ${data.deviceName}
Device Model: ${data.deviceModel}
Device Brand: ${data.deviceBrand}
Issue Type: ${issueTypeText}
Timestamp: ${data.timestamp}
${data.serialNumber ? `Serial Number: ${data.serialNumber}` : ''}

This is an automated notification from our IT Asset Management system.
A device under warranty/support may require attention.

Please contact our IT department if you need additional information about this device.
    `.trim();

    const html = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
      Device Support Notification
    </h2>
    
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #dc2626;">Device ${issueTypeText}</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Ticket ID:</td>
          <td style="padding: 8px 0;">${data.ticketNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold;">Device Name:</td>
          <td style="padding: 8px 0;">${data.deviceName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold;">Device Model:</td>
          <td style="padding: 8px 0;">${data.deviceModel}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold;">Device Brand:</td>
          <td style="padding: 8px 0;">${data.deviceBrand}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold;">Issue Type:</td>
          <td style="padding: 8px 0;"><span style="color: #dc2626; font-weight: bold;">${issueTypeText}</span></td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold;">Timestamp:</td>
          <td style="padding: 8px 0;">${data.timestamp}</td>
        </tr>
        ${data.serialNumber ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Serial Number:</td>
          <td style="padding: 8px 0;">${data.serialNumber}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
      <p style="margin: 0;">
        <strong>Automated Notification:</strong> This is an automated notification from our IT Asset Management system.
        A device under warranty/support may require attention.
      </p>
    </div>
    
    <p style="margin-top: 20px; color: #6b7280;">
      Please contact our IT department if you need additional information about this device.
    </p>
  </div>
</body>
</html>
    `.trim();

    return { subject, html, text };
  }

  async sendDeviceNotification(deviceData: DeviceEmailData): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('📧 Email Service: Transporter not initialized');
        return false;
      }

      // Extract brand from device model if not explicitly provided
      const deviceBrand = deviceData.deviceBrand || this.extractBrandFromModel(deviceData.deviceModel);
      const brandEmail = this.getBrandEmail(deviceBrand);

      if (!brandEmail) {
        console.log(`📧 Email Service: No support email found for brand "${deviceBrand}" (model: ${deviceData.deviceModel})`);
        console.log('📧 Available brands:', Object.keys(BRAND_EMAIL_MAPPING).join(', '));
        return false;
      }

      const emailContent = this.generateEmailContent({
        ...deviceData,
        deviceBrand
      });

      const mailOptions = {
        from: process.env.SMTP_EMAIL || 'itam-system@company.com',
        to: brandEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      };

      if (this.isConfigured) {
        // Send real email
        const result = await this.transporter.sendMail(mailOptions);
        console.log(`📧 Email sent successfully to ${brandEmail} for ticket ${deviceData.ticketNumber}`);
        console.log(`📧 Message ID: ${result.messageId}`);
        return true;
      } else {
        // Development mode - log email content
        console.log('\n=== EMAIL NOTIFICATION (Development Mode) ===');
        console.log(`📧 To: ${brandEmail}`);
        console.log(`📧 Subject: ${emailContent.subject}`);
        console.log(`📧 Ticket: ${deviceData.ticketNumber}`);
        console.log(`📧 Device: ${deviceData.deviceName} (${deviceData.deviceModel})`);
        console.log(`📧 Issue: ${deviceData.issueType}`);
        console.log(`📧 Timestamp: ${deviceData.timestamp}`);
        console.log('📧 Email content logged - would be sent in production');
        console.log('===============================================\n');
        return true;
      }
    } catch (error) {
      console.error('📧 Email Service: Failed to send notification:', error);
      return false;
    }
  }

  // Test method to verify email configuration
  async testConfiguration(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }

      if (this.isConfigured) {
        await this.transporter.verify();
        console.log('📧 Email Service: SMTP configuration verified successfully');
        return true;
      } else {
        console.log('📧 Email Service: Running in development mode - configuration test skipped');
        return true;
      }
    } catch (error) {
      console.error('📧 Email Service: Configuration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export { DeviceEmailData };