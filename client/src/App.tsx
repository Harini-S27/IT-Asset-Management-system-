import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import MapView from "@/pages/map";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import Sidebar from "@/components/layout/sidebar";
import LoginPage from "@/pages/login";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

// Protected route component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  if (!isAuthenticated) {
    return <Redirect to={`/login?redirect=${encodeURIComponent(location)}`} />;
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
          <main className="flex-1 overflow-auto ml-64">
            <div className="p-4 h-full">
              <Switch>
                <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
                <Route path="/devices" component={() => <ProtectedRoute component={Devices} />} />
                <Route path="/map" component={() => <ProtectedRoute component={MapView} />} />
                <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
                <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
                <Route path="/login" component={LoginPage} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
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
