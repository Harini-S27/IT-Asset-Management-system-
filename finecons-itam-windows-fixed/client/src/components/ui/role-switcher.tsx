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
import { User, LogOut } from "lucide-react";

export function RoleSwitcher() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          {user.username}
          <Badge variant="secondary" className="ml-1">
            {user.role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium">Current Session</div>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          <div>User: {user.username}</div>
          <div>Role: {user.role}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600 gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}