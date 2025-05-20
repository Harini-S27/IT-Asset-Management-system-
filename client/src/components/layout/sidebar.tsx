import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Monitor, 
  Map, 
  Settings, 
  FileBarChart, 
  Cpu 
} from "lucide-react";

const Sidebar = () => {
  const [location] = useLocation();

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
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileBarChart,
    },
  ];

  return (
    <aside className="sidebar w-64 bg-[#2D3748] text-white p-4 flex flex-col h-screen fixed">
      <div className="mb-8 mt-4">
        <h1 className="text-xl font-bold flex items-center">
          <Cpu className="h-6 w-6 mr-2" />
          IT Asset Manager
        </h1>
      </div>
      
      <nav className="flex-1">
        <ul>
          {navigationItems.map((item) => (
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
          ))}
        </ul>
      </nav>
      
      <div className="mt-auto pb-4">
        <div className="flex items-center px-4 py-3">
          <div className="h-8 w-8 rounded-full bg-gray-600 mr-3 flex items-center justify-center text-sm">
            AU
          </div>
          <div>
            <p className="text-sm font-semibold">Admin User</p>
            <p className="text-xs text-gray-300">admin@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
