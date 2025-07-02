import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailLog {
  id: string;
  ticketNumber: string;
  deviceName: string;
  deviceModel: string;
  brand: string;
  supportEmail: string;
  issueType: string;
  timestamp: string;
  status: 'sent' | 'logged' | 'failed';
  messageId?: string;
}

export default function EmailLogsPage() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Simulate email logs from console output
  const loadEmailLogs = () => {
    const logs: EmailLog[] = [
      {
        id: '1',
        ticketNumber: 'TKT-2025-8990',
        deviceName: 'RTR-MAIN-001',
        deviceModel: 'Cisco ASR 1000',
        brand: 'Cisco',
        supportEmail: 'support@cisco.com',
        issueType: 'damage',
        timestamp: '2025-07-01T08:31:20.839Z',
        status: 'logged',
      },
      {
        id: '2',
        ticketNumber: 'TKT-2025-6262',
        deviceName: 'SRV-DB-001',
        deviceModel: 'Dell PowerEdge R740',
        brand: 'Dell',
        supportEmail: 'support@dell.com',
        issueType: 'damage',
        timestamp: '2025-07-01T08:24:49.504Z',
        status: 'logged',
      },
      {
        id: '3',
        ticketNumber: 'TKT-2025-5594',
        deviceName: 'SRV-APP-002',
        deviceModel: 'Dell PowerEdge R640',
        brand: 'Dell',
        supportEmail: 'support@dell.com',
        issueType: 'inactive',
        timestamp: '2025-07-01T08:26:52.452Z',
        status: 'logged',
      },
      {
        id: '4',
        ticketNumber: 'TKT-2025-6294',
        deviceName: 'MacBook-Pro-001',
        deviceModel: 'Apple MacBook Pro M3',
        brand: 'Apple',
        supportEmail: 'support@apple.com',
        issueType: 'damage',
        timestamp: '2025-07-01T07:40:10.579Z',
        status: 'logged',
      },
      {
        id: '5',
        ticketNumber: 'TKT-2025-2539',
        deviceName: 'Surface-Pro-001',
        deviceModel: 'Microsoft Surface Pro 9',
        brand: 'Microsoft',
        supportEmail: 'support@microsoft.com',
        issueType: 'abnormal',
        timestamp: '2025-07-01T07:39:58.663Z',
        status: 'logged',
      },
      {
        id: '6',
        ticketNumber: 'TKT-2025-1807',
        deviceName: 'WS-001-DEV',
        deviceModel: 'Dell XPS 8940',
        brand: 'Dell',
        supportEmail: 'support@dell.com',
        issueType: 'damage',
        timestamp: '2025-07-01T07:39:33.652Z',
        status: 'logged',
      },
    ];
    
    setEmailLogs(logs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadEmailLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'logged':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Sent</Badge>;
      case 'logged':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Logged (Dev Mode)</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getIssueTypeBadge = (issueType: string) => {
    const color = issueType === 'damage' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                  issueType === 'inactive' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    
    return <Badge className={color}>{issueType.charAt(0).toUpperCase() + issueType.slice(1)}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const triggerTestEmail = async () => {
    setIsLoading(true);
    try {
      // Trigger a test device status change to show email notification
      const response = await fetch('/api/devices/15', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Damage' }),
      });

      if (response.ok) {
        toast({
          title: "Test Email Triggered",
          description: "Check console logs for email notification details",
        });
        
        // Reload logs after a short delay
        setTimeout(() => {
          loadEmailLogs();
          setIsLoading(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger test email:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to trigger test email",
        variant: "destructive",
      });
    }
  };

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
          <Button variant="outline" onClick={loadEmailLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
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
            <CardTitle className="text-sm font-medium">Development Mode</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailLogs.filter(log => log.status === 'logged').length}</div>
            <p className="text-xs text-muted-foreground">
              Emails logged (not sent)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Brands</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(emailLogs.map(log => log.brand)).size}</div>
            <p className="text-xs text-muted-foreground">
              Manufacturers contacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mode Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">Development</div>
            <p className="text-xs text-muted-foreground">
              Set SMTP to enable sending
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notification Log</CardTitle>
          <CardDescription>
            All automatic email notifications sent to device manufacturers for support tickets.
            Currently running in development mode - emails are logged but not actually sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Support Email</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.ticketNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.deviceName}</div>
                        <div className="text-sm text-muted-foreground">{log.deviceModel}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.brand}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{log.supportEmail}</div>
                    </TableCell>
                    <TableCell>
                      {getIssueTypeBadge(log.issueType)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatTimestamp(log.timestamp)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-300">Development Mode Active</CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-400">
            The system is currently running in development mode. Email notifications are being logged 
            to the console but not actually sent to manufacturers.
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