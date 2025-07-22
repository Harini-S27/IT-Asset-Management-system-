import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Monitor, 
  Map, 
  Settings, 
  FileBarChart, 
  LogOut,
  Shield,
  Router,
  Globe,
  Ticket,
  Mail,
  Bell,
  Database,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { UserMenu } from "./user-menu";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import logoImage from "../../assets/logo.png";

const Sidebar = () => {
  const [location] = useLocation();
  const { user, logout, canAccess } = useAuth();

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Devices",
      href: "/devices",
      icon: Monitor,
    },
    {
      name: "Map View",
      href: "/map",
      icon: Map,
    },
    {
      name: "Prohibited Software",
      href: "/prohibited-software",
      icon: Shield,
    },
    {
      name: "Support Tickets",
      href: "/tickets",
      icon: Ticket,
    },
    {
      name: "Email Notifications",
      href: "/email-logs",
      icon: Mail,
    },
    {
      name: "Router Setup",
      href: "/router-setup",
      icon: Router,
    },
    {
      name: "Blocked Websites",
      href: "/global-blocking",
      icon: Globe,
    },
    {
      name: "Network Discovery",
      href: "/network-discovery",
      icon: Router,
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
    },
    {
      name: "CMDB",
      href: "/cmdb",
      icon: Database,
    },
    {
      name: "Alert Management",
      href: "/alerts",
      icon: AlertTriangle,
    },
    {
      name: "Asset Lifecycle",
      href: "/asset-lifecycle",
      icon: Calendar,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileBarChart,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="sidebar w-64 bg-[#2D3748] text-white p-4 flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="mb-8 mt-4">
        <h1 className="text-xl font-bold flex items-center">
          <div className="h-16 w-16 mr-3 bg-white rounded-lg p-2 flex items-center justify-center">
            <img src={logoImage} alt="IT Asset Manager Logo" className="h-12 w-12 object-contain" />
          </div>
          IT Asset Manager
        </h1>
      </div>
      
      <nav className="flex-1">
        <ul>
          {navigationItems.map((item) => {
            // Only show navigation items that the user can access
            if (!canAccess(item.href)) return null;
            
            return (
              <li key={item.name} className="mb-1">
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center py-2 px-4 rounded hover:bg-[#4299E1] transition-colors cursor-pointer",
                      location === item.href ? "bg-[#4299E1]" : ""
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="mt-auto pb-4">
        {user ? (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <UserMenu />
              <div className="ml-2">
                <p className="text-sm font-semibold">{user.username}</p>
                <p className="text-xs text-gray-300">{user.role}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0 text-white hover:bg-red-700/20" 
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="px-4 py-3 text-sm">
            <Link href="/login">
              <Button variant="outline" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                Log In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
