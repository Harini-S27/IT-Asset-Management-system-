import { GlobalBlockingTable } from "@/components/global-blocking/global-blocking-table";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye } from "lucide-react";

export default function GlobalBlocking() {
  const { user, hasPermission } = useAuth();
  
  const canManage = hasPermission('block_websites');
  const canView = hasPermission('view_network');

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blocked Websites</h1>
            <p className="text-muted-foreground">
              {canManage 
                ? "Manage network-wide website blocking across all discovered devices"
                : "View currently blocked websites across the network"
              }
            </p>
          </div>
          
          {/* Role indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm">
            {canManage ? (
              <>
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 font-medium">Management Access</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 text-green-600" />
                <span className="text-green-700 font-medium">View Only</span>
              </>
            )}
          </div>
        </div>

        {/* Viewer role notice */}
        {!canManage && canView && (
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              You have read-only access to this section. Contact an Admin or Manager to modify website blocking settings.
            </AlertDescription>
          </Alert>
        )}
        
        <GlobalBlockingTable />
      </div>
    </div>
  );
}