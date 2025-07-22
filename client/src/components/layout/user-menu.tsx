import React from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';
import fineConsLogo from '../../assets/finecons-logo.jpg';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [_, setLocation] = useLocation();

  if (!user) return null;

  const userInitials = user.username
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();

  const roleColors = {
    Admin: 'bg-rose-500',
    Manager: 'bg-amber-500',
    Viewer: 'bg-emerald-500'
  };

  const roleColor = user.role in roleColors 
    ? roleColors[user.role as keyof typeof roleColors] 
    : 'bg-gray-500';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className={user.username === 'Finecons' ? 'bg-white' : roleColor}>
            {user.username === 'Finecons' ? (
              <AvatarImage src={fineConsLogo} alt="Finecons Logo" className="object-cover" />
            ) : (
              <AvatarFallback>{userInitials}</AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user.username}</span>
            <span className="text-xs text-muted-foreground">{user.role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation('/profile')}>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}