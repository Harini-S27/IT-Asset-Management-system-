import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import MapView from "@/pages/map";
import ProhibitedSoftware from "@/pages/prohibited-software";
import Tickets from "@/pages/tickets";
import EmailLogs from "@/pages/email-logs";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import RouterSetup from "@/pages/router-setup";
import GlobalBlocking from "@/pages/global-blocking";
import NetworkDiscovery from "@/pages/network-discovery";
import { NotificationsHistoryPage } from "@/pages/notifications-history";
import CmdbPage from "@/pages/cmdb";
import AlertsCompactPage from "@/pages/alerts-compact";
import AssetLifecyclePage from "@/pages/asset-lifecycle";
import Sidebar from "@/components/layout/sidebar";
import LoginPage from "@/pages/login";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { NotificationManager } from "@/components/notifications/notification-manager";

// Protected route component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  const { isAuthenticated } = useAuth();
  
  return (
    <>
      {isAuthenticated ? (
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <main className="flex-1 overflow-auto ml-64 relative">
            <div className="p-4 h-full">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/devices" component={Devices} />
                <Route path="/map" component={MapView} />
                <Route path="/prohibited-software" component={ProhibitedSoftware} />
                <Route path="/tickets" component={Tickets} />
                <Route path="/email-logs" component={EmailLogs} />
                <Route path="/router-setup" component={RouterSetup} />
                <Route path="/global-blocking" component={GlobalBlocking} />
                <Route path="/network-discovery" component={NetworkDiscovery} />
                <Route path="/notifications" component={NotificationsHistoryPage} />
                <Route path="/cmdb" component={CmdbPage} />
                <Route path="/alerts" component={AlertsCompactPage} />
                <Route path="/asset-lifecycle" component={AssetLifecyclePage} />
                <Route path="/settings" component={Settings} />
                <Route path="/reports" component={Reports} />
                <Route path="/login">
                  <Redirect to="/" />
                </Route>
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
          <NotificationManager />
        </div>
      ) : (
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route>
            <Redirect to="/login" />
          </Route>
        </Switch>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
