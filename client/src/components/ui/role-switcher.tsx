import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { UserCheck, Shield, Eye, Settings } from "lucide-react";

export function RoleSwitcher() {
  const { user, login, logout } = useAuth();

  const roles = [
    { name: "Admin", credentials: { username: "admin", password: "admin123" }, icon: Settings, color: "red" },
    { name: "Manager", credentials: { username: "manager", password: "manager123" }, icon: Shield, color: "blue" },
    { name: "Viewer", credentials: { username: "viewer", password: "viewer123" }, icon: Eye, color: "green" }
  ];

  const switchRole = (role: typeof roles[0]) => {
    login(role.credentials.username, role.name, false);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCheck className="h-4 w-4" />
          Switch Role
          <Badge variant="secondary" className="ml-1">
            {user.role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium">Demo Role Switching</div>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const Icon = role.icon;
          const isCurrentRole = user.role === role.name;
          
          return (
            <DropdownMenuItem
              key={role.name}
              onClick={() => switchRole(role)}
              disabled={isCurrentRole}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{role.name}</div>
                <div className="text-xs text-muted-foreground">
                  {role.credentials.username}/{role.credentials.password}
                </div>
              </div>
              {isCurrentRole && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600">
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}