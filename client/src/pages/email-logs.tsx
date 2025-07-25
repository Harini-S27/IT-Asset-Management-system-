import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, CheckCircle, Clock, AlertCircle, ChevronDown, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface EmailLog {
  timestamp: string;
  recipient: string;
  subject: string;
}

export default function EmailLogsPage() {
  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch email logs from API
  const { data: emailLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/email-logs'],
    queryFn: async () => {
      const response = await fetch('/api/email-logs');
      if (!response.ok) {
        throw new Error('Failed to fetch email logs');
      }
      return response.json() as Promise<EmailLog[]>;
    }
  });

  // Fetch email configuration status
  const { data: emailConfig } = useQuery({
    queryKey: ['/api/email-config'],
    queryFn: async () => {
      const response = await fetch('/api/email-config');
      if (!response.ok) {
        throw new Error('Failed to fetch email configuration');
      }
      return response.json() as Promise<{
        isConfigured: boolean;
        mode: string;
        hasCredentials: boolean;
      }>;
    }
  });

  const extractBrandFromEmail = (email: string): string => {
    if (email.includes('@')) {
      const domain = email.split('@')[1];
      return domain.split('.')[0].toLowerCase();
    }
    return 'unknown';
  };

  const extractTicketFromSubject = (subject: string): string => {
    const match = subject.match(/TKT-\d{4}-\d{4}/);
    return match ? match[0] : 'N/A';
  };

  const extractIssueTypeFromSubject = (subject: string): string => {
    if (subject.includes('Damaged')) return 'damage';
    if (subject.includes('Inactive')) return 'inactive';
    if (subject.includes('Abnormal')) return 'abnormal';
    return 'unknown';
  };

  const getIssueTypeBadge = (issueType: string) => {
    const color = issueType === 'damage' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                  issueType === 'inactive' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                  issueType === 'abnormal' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    
    return <Badge className={color}>{issueType.charAt(0).toUpperCase() + issueType.slice(1)}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const triggerTestEmail = async () => {
    try {
      // Send a test email directly using the test email endpoint
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          to: 'support@apple.com',
          subject: 'ITAM System Test Email',
          message: 'This is a test email from the IT Asset Management system to verify email notifications are working correctly.'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Test Email Sent",
          description: `Email sent successfully to ${result.to}`,
        });
        
        // Reload logs after a short delay
        setTimeout(() => {
          refetch();
        }, 2000);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to trigger test email:', error);
      toast({
        title: "Error",
        description: `Failed to send test email: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  // Calculate unique brands from email logs
  const uniqueBrands = new Set(emailLogs.map(log => extractBrandFromEmail(log.recipient)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Notifications</h1>
          <p className="text-muted-foreground">
            Automatic email notifications sent to device manufacturers for support tickets
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={triggerTestEmail} disabled={isLoading}>
            <Mail className="mr-2 h-4 w-4" />
            Trigger Test Email
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Automatic notifications sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Mode</CardTitle>
            {emailConfig?.isConfigured ? 
              <CheckCircle className="h-4 w-4 text-green-500" /> : 
              <Clock className="h-4 w-4 text-blue-500" />
            }
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {emailConfig?.mode === 'production' ? 'Production' : 'Development'}
            </div>
            <p className="text-xs text-muted-foreground">
              {emailConfig?.isConfigured ? 'Emails being sent to manufacturers' : 'Emails logged (not sent)'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Brands</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueBrands.size}</div>
            <p className="text-xs text-muted-foreground">
              Manufacturers contacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMTP Status</CardTitle>
            {emailConfig?.hasCredentials ? 
              <CheckCircle className="h-4 w-4 text-green-500" /> : 
              <AlertCircle className="h-4 w-4 text-orange-500" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${emailConfig?.hasCredentials ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {emailConfig?.hasCredentials ? 'Configured' : 'Not Set'}
            </div>
            <p className="text-xs text-muted-foreground">
              {emailConfig?.hasCredentials ? 'SMTP credentials available' : 'Set SMTP to enable sending'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email History Dropdown */}
      <div className="relative">
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between h-auto p-4 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">📧 Email History & Notification Log</div>
                  <div className="text-sm text-muted-foreground">
                    {emailLogs.length} email notifications logged • Click to view detailed history
                  </div>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="p-0 min-w-full"
            style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}
            align="start"
          >
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  Complete history of all automatic email notifications sent to device manufacturers.
                  All emails are logged to email_log.txt file for audit trail and compliance.
                  {emailConfig?.isConfigured ? 
                    ' Production mode active - emails are being sent to manufacturer support teams.' :
                    ' Development mode active - emails are logged but not sent to prevent spam during testing.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Ticket</TableHead>
                        <TableHead className="text-xs">Brand</TableHead>
                        <TableHead className="text-xs">Support Email</TableHead>
                        <TableHead className="text-xs">Issue Type</TableHead>
                        <TableHead className="text-xs">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-sm">
                            {isLoading ? "Loading email logs..." : "No email logs found. Generate some tickets to see email notifications."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        emailLogs.map((log, index) => (
                          <TableRow key={index} className="text-sm">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-blue-500" />
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs">
                                  Logged (Dev Mode)
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-xs">{extractTicketFromSubject(log.subject)}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{extractBrandFromEmail(log.recipient)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-xs">{log.recipient}</div>
                            </TableCell>
                            <TableCell>
                              {getIssueTypeBadge(extractIssueTypeFromSubject(log.subject))}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">{formatTimestamp(log.timestamp)}</div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-300">Development Mode Active</CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-400">
            The system is currently running in development mode. Email notifications are being logged 
            to email_log.txt but not actually sent to manufacturers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>To enable real email sending:</strong>
            </p>
            <ul className="text-sm text-blue-600 dark:text-blue-400 list-disc list-inside space-y-1">
              <li>Set <code>SMTP_EMAIL</code> environment variable with your email address</li>
              <li>Set <code>SMTP_PASSWORD</code> environment variable with your email password</li>
              <li>Restart the application</li>
            </ul>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
              Once configured, emails will be automatically sent to manufacturer support addresses 
              whenever devices are marked as damaged, inactive, or abnormal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}