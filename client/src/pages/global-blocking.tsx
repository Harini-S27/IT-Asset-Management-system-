import { GlobalBlockingTable } from "@/components/global-blocking/global-blocking-table";

export default function GlobalBlocking() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blocked Websites</h1>
          <p className="text-muted-foreground">
            Manage network-wide website blocking across all discovered devices
          </p>
        </div>
        
        <GlobalBlockingTable />
      </div>
    </div>
  );
}