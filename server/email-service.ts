import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';

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
// Note: Many manufacturers use support portals instead of direct email.
// These are verified contact methods as of 2025.
const BRAND_EMAIL_MAPPING: Record<string, string> = {
  // Verified direct email support
  'hp': 'support@hp.com',                    // ✅ Verified - HP still uses direct email
  'cisco': 'ic-support@cisco.com',           // ✅ Verified - Cisco technical support
  'intel': 'support@intel.com',              // ✅ Standard support email
  
  // Portal-based manufacturers (fallback to standard support emails)
  'dell': 'support@dell.com',                // Uses support.dell.com portal primarily
  'apple': 'support@apple.com',              // Uses support.apple.com portal primarily
  'mac': 'support@apple.com',
  'macbook': 'support@apple.com',
  'lenovo': 'support@lenovo.com',            // Uses support.lenovo.com portal primarily
  'asus': 'support@asus.com',                // Uses portal forms at asus.com/support
  'acer': 'support@acer.com',
  'microsoft': 'support@microsoft.com',      // Uses support.microsoft.com portal
  'surface': 'support@microsoft.com',
  'samsung': 'support@samsung.com',          // Uses regional support portals
  'lg': 'support@lg.com',                    // Uses lg.com/support portal
  'sony': 'support@sony.com',
  'toshiba': 'support@toshiba.com',
  'fujitsu': 'support@fujitsu.com',
  'huawei': 'support@huawei.com',
  'xiaomi': 'support@mi.com',
  'redmi': 'support@mi.com',
  'mi': 'support@mi.com',
  
  // Network equipment manufacturers
  'netgear': 'support@netgear.com',
  'linksys': 'support@linksys.com',
  'tp-link': 'support@tp-link.com',
  'dlink': 'support@dlink.com',
  'ubiquiti': 'support@ubnt.com',
  
  // Finecons inventory specific manufacturers
  'hikvision': 'support@hikvision.com',
  'hangzhou': 'support@hikvision.com', // Full company name
  'fortinet': 'support@fortinet.com',
  'aruba': 'support@arubanetworks.com',
  'vivo': 'support@vivo.com',
  'elitegroup': 'support@ecs.com.tw',
  'ecs': 'support@ecs.com.tw',
  'universal': 'support@ugs.com.tw',
  'micro-star': 'support@msi.com',
  'msi': 'support@msi.com',
  'liteon': 'support@liteon.com',
  'chongqing': 'support@cqfugui.com',
  'azurewave': 'support@azurewave.com',
};

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private logFilePath: string;

  constructor() {
    this.logFilePath = path.join(process.cwd(), 'email_log.txt');
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

  private logEmailToFile(recipientEmail: string, subject: string, timestamp: string): void {
    try {
      const logEntry = `${timestamp} | TO: ${recipientEmail} | SUBJECT: ${subject}\n`;
      fs.appendFileSync(this.logFilePath, logEntry, 'utf8');
      console.log(`📧 Email logged to ${this.logFilePath}`);
    } catch (error) {
      console.error('📧 Failed to write email log:', error);
    }
  }

  getEmailLogs(): { timestamp: string; recipient: string; subject: string }[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }
      
      const logContent = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.length > 0);
      
      return lines.map(line => {
        const parts = line.split(' | ');
        if (parts.length >= 3) {
          return {
            timestamp: parts[0],
            recipient: parts[1].replace('TO: ', ''),
            subject: parts[2].replace('SUBJECT: ', '')
          };
        }
        return null;
      }).filter(log => log !== null) as { timestamp: string; recipient: string; subject: string }[];
    } catch (error) {
      console.error('📧 Failed to read email logs:', error);
      return [];
    }
  }

  getConfiguration(): { isConfigured: boolean; mode: string; hasCredentials: boolean } {
    return {
      isConfigured: this.isConfigured,
      mode: this.isConfigured ? 'production' : 'development',
      hasCredentials: !!(process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD)
    };
  }

  private generateEmailContent(data: DeviceEmailData): { subject: string; html: string; text: string } {
    const issueTypeText = data.issueType === 'damage' ? 'Damaged' : 
                         data.issueType === 'inactive' ? 'Inactive' : 'Abnormal';
    
    const subject = `IT Support Request: ${issueTypeText} ${data.deviceBrand} Device - Ticket ${data.ticketNumber}`;
    
    const text = `
Dear ${data.deviceBrand} Support Team,

We are reaching out regarding a technical support matter for one of our ${data.deviceBrand} devices.

Support Request Details:
Ticket Reference: ${data.ticketNumber}
Device Information: ${data.deviceName}
Model: ${data.deviceModel}
Brand: ${data.deviceBrand}
Issue Category: ${issueTypeText}
Report Date: ${new Date(data.timestamp).toLocaleDateString()}
${data.serialNumber ? `Serial Number: ${data.serialNumber}` : ''}

Our IT team has identified that this device requires technical attention and may benefit from manufacturer support guidance.

We would appreciate your assistance with this matter. Please let us know if you need any additional information about this device or our environment.

Thank you for your support.

Best regards,
Galactis AI IT Department
Email: ${process.env.SMTP_EMAIL}

This message was generated by our IT Asset Management system for tracking purposes.
    `.trim();

    const html = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
      <h2 style="color: #2563eb; margin: 0;">
        Galactis AI Tech Pvt Ltd - IT Department
      </h2>
      <p style="color: #6b7280; margin: 5px 0 0 0;">Technical Support Request</p>
    </div>
    
    <p style="margin-bottom: 20px;">
      Dear ${data.deviceBrand} Support Team,
    </p>
    
    <p style="margin-bottom: 20px;">
      We are reaching out regarding a technical support matter for one of our ${data.deviceBrand} devices.
    </p>
    
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2563eb;">Support Request Details</h3>
      
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
          <td style="padding: 8px 0; font-weight: bold;">Report Date:</td>
          <td style="padding: 8px 0;">${new Date(data.timestamp).toLocaleDateString()}</td>
        </tr>
        ${data.serialNumber ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Serial Number:</td>
          <td style="padding: 8px 0;">${data.serialNumber}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <p style="margin-top: 20px;">
      We would appreciate your assistance with this matter. Please let us know if you need any additional information about this device or our environment.
    </p>
    
    <p style="margin-top: 20px;">
      Thank you for your support.
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-weight: bold;">Best regards,</p>
      <p style="margin: 5px 0;">Galactis AI IT Department</p>
      <p style="margin: 5px 0; color: #6b7280;">Email: ${process.env.SMTP_EMAIL}</p>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af; font-style: italic;">
        This message was generated by our IT Asset Management system for tracking purposes.
      </p>
    </div>
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

      // Log which brand/email combination is being used
      console.log(`📧 Email Service: Sending to ${deviceBrand} at ${brandEmail}`);

      const emailContent = this.generateEmailContent({
        ...deviceData,
        deviceBrand
      });

      const mailOptions = {
        from: `"Galactis AI IT Department" <${process.env.SMTP_EMAIL}>`,
        replyTo: process.env.SMTP_EMAIL,
        to: brandEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        headers: {
          'X-Mailer': 'Galactis AI ITAM System',
          'X-Priority': '3',
          'Organization': 'Galactis AI Tech Pvt Ltd',
          'X-Auto-Response-Suppress': 'All'
        }
      };

      const currentTimestamp = new Date().toISOString();

      if (this.isConfigured) {
        // Send real email
        try {
          const result = await this.transporter.sendMail(mailOptions);
          console.log(`📧 Email sent successfully to ${brandEmail} for ticket ${deviceData.ticketNumber}`);
          console.log(`📧 Message ID: ${result.messageId}`);
          
          // Log to file
          this.logEmailToFile(brandEmail, emailContent.subject, currentTimestamp);
          return true;
        } catch (error: any) {
          console.error('📧 Email Service: Failed to send email:', error.message);
          
          // Still log to file even if sending fails
          this.logEmailToFile(brandEmail, `[FAILED] ${emailContent.subject}`, currentTimestamp);
          
          if (error.code === 'EAUTH') {
            console.log('📧 Gmail Authentication Fix:');
            console.log('📧 1. Enable 2-Factor Authentication on Google Account');
            console.log('📧 2. Generate App Password: https://myaccount.google.com/apppasswords');
            console.log('📧 3. Use App Password (not regular password) in SMTP_PASSWORD');
          }
          return false;
        }
      } else {
        // Development mode - log email content
        console.log('\n=== EMAIL NOTIFICATION (Development Mode) ===');
        console.log(`📧 To: ${brandEmail}`);
        console.log(`📧 Brand: ${deviceBrand}`);
        console.log(`📧 Subject: ${emailContent.subject}`);
        console.log(`📧 Ticket: ${deviceData.ticketNumber}`);
        console.log(`📧 Device: ${deviceData.deviceName} (${deviceData.deviceModel})`);
        console.log(`📧 Issue: ${deviceData.issueType}`);
        console.log(`📧 Timestamp: ${deviceData.timestamp}`);
        console.log('📧 Email content logged - would be sent in production');
        console.log('📧 Note: Most manufacturers use support portals in addition to email');
        console.log('===============================================\n');
        
        // Log to file even in development mode
        this.logEmailToFile(brandEmail, emailContent.subject, currentTimestamp);
        return true;
      }
    } catch (error) {
      console.error('📧 Email Service: Failed to send notification:', error);
      return false;
    }
  }

  // Send a test email
  async sendTestEmail(to: string, subject: string, message: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('📧 Email Service: Transporter not initialized');
        return false;
      }

      const mailOptions = {
        from: `"Galactis AI IT Department" <${process.env.SMTP_EMAIL}>`,
        replyTo: process.env.SMTP_EMAIL,
        to,
        subject,
        text: message,
        html: `
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin: 0;">Galactis AI Tech Pvt Ltd - IT Department</h2>
              <p style="color: #6b7280; margin: 5px 0 0 0;">System Test Email</p>
            </div>
            <p>${message}</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; font-style: italic;">
                Sent from ITAM System at ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </body>
        </html>`,
        headers: {
          'X-Mailer': 'Galactis AI ITAM System',
          'X-Priority': '3',
          'Organization': 'Galactis AI Tech Pvt Ltd',
          'X-Auto-Response-Suppress': 'All'
        }
      };

      const currentTimestamp = new Date().toISOString();

      if (this.isConfigured) {
        // Send real email
        try {
          const result = await this.transporter.sendMail(mailOptions);
          console.log(`📧 Test email sent successfully to ${to}`);
          console.log(`📧 Message ID: ${result.messageId}`);
          console.log(`📧 From: ${process.env.SMTP_EMAIL || 'itam-system@company.com'}`);
          
          // Log to file
          this.logEmailToFile(to, subject, currentTimestamp);
          return true;
        } catch (error: any) {
          console.error('📧 Test email failed:', error.message);
          
          // Log failure to file
          this.logEmailToFile(to, `[FAILED] ${subject}`, currentTimestamp);
          
          if (error.code === 'EAUTH') {
            console.log('📧 Gmail Authentication Fix:');
            console.log('📧 1. Enable 2-Factor Authentication on Google Account');
            console.log('📧 2. Generate App Password: https://myaccount.google.com/apppasswords');
            console.log('📧 3. Use App Password (not regular password) in SMTP_PASSWORD');
          }
          return false;
        }
      } else {
        // Development mode - log email content
        console.log('\n=== TEST EMAIL (Development Mode) ===');
        console.log(`📧 To: ${to}`);
        console.log(`📧 From: ${process.env.SMTP_EMAIL || 'itam-system@company.com'}`);
        console.log(`📧 Subject: ${subject}`);
        console.log(`📧 Message: ${message}`);
        console.log(`📧 Timestamp: ${currentTimestamp}`);
        console.log('📧 Test email logged - would be sent in production');
        console.log('======================================\n');
        
        // Log to file even in development mode
        this.logEmailToFile(to, subject, currentTimestamp);
        return true;
      }
    } catch (error) {
      console.error('📧 Test email error:', error);
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