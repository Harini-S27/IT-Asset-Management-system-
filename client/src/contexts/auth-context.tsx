import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

type User = {
  username: string;
  role: string;
};

type Permission = 
  | 'view_devices' | 'edit_devices' | 'delete_devices'
  | 'view_software' | 'edit_software' | 'delete_software' 
  | 'view_reports' | 'export_reports'
  | 'view_network' | 'manage_network' | 'block_websites'
  | 'view_settings' | 'manage_settings' | 'manage_users'
  | 'configure_router' | 'scan_devices';

type AuthContextType = {
  user: User | null;
  login: (username: string, role: string, rememberMe: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  canAccess: (page: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based permissions configuration
const ROLE_PERMISSIONS = {
  Admin: [
    'view_devices', 'edit_devices', 'delete_devices',
    'view_software', 'edit_software', 'delete_software',
    'view_tickets', 'manage_tickets', 'close_tickets',
    'view_reports', 'export_reports',
    'view_network', 'manage_network', 'block_websites',
    'view_settings', 'manage_settings', 'manage_users',
    'configure_router', 'scan_devices'
  ] as Permission[],
  Manager: [
    'view_devices', 'edit_devices', 'delete_devices',
    'view_software', 'edit_software', 'delete_software',
    'view_tickets', 'manage_tickets', 'close_tickets',
    'view_reports',
    'view_network', 'manage_network', 'block_websites',
    'configure_router', 'scan_devices'
  ] as Permission[],
  Viewer: [
    'view_devices',
    'view_software',
    'view_tickets',
    'view_reports',
    'view_network'
  ] as Permission[]
};

// Pages accessible by role
const ROLE_PAGES = {
  Admin: ['/', '/devices', '/map', '/prohibited-software', '/tickets', '/email-logs', '/router-setup', '/global-blocking', '/network-discovery', '/notifications', '/cmdb', '/alerts', '/asset-lifecycle', '/settings', '/reports'],
  Manager: ['/', '/devices', '/map', '/prohibited-software', '/tickets', '/email-logs', '/router-setup', '/global-blocking', '/network-discovery', '/notifications', '/cmdb', '/alerts', '/asset-lifecycle', '/reports'],
  Viewer: ['/', '/devices', '/map', '/prohibited-software', '/tickets', '/email-logs', '/network-discovery', '/notifications', '/cmdb', '/alerts', '/asset-lifecycle', '/reports']
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already logged in
    // First check localStorage (persistent "remember me"), then sessionStorage (current session)
    const persistentUser = localStorage.getItem('user');
    const sessionUser = sessionStorage.getItem('user');
    
    if (persistentUser) {
      console.log('Restoring user from localStorage (remember me):', persistentUser);
      setUser(JSON.parse(persistentUser));
    } else if (sessionUser) {
      console.log('Restoring user from sessionStorage (current session):', sessionUser);
      setUser(JSON.parse(sessionUser));
    } else {
      console.log('No stored user found, user needs to login');
    }
  }, []);

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    return userPermissions.includes(permission);
  };

  const canAccess = (page: string): boolean => {
    if (!user) return false;
    const allowedPages = ROLE_PAGES[user.role as keyof typeof ROLE_PAGES] || [];
    return allowedPages.includes(page);
  };

  const login = (username: string, role: string, rememberMe: boolean) => {
    const userData = { username, role };
    setUser(userData);
    
    console.log('Logging in user:', username, 'Role:', role, 'Remember me:', rememberMe);
    
    // Clear any existing auth data first
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    // Store auth data based on remember me selection
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('User data stored in localStorage for persistent login');
    } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
      console.log('User data stored in sessionStorage for current session only');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      hasPermission,
      canAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}