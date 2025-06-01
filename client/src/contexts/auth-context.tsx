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
  admin: [
    'view_devices', 'edit_devices', 'delete_devices',
    'view_software', 'edit_software', 'delete_software',
    'view_reports', 'export_reports',
    'view_network', 'manage_network', 'block_websites',
    'view_settings', 'manage_settings', 'manage_users',
    'configure_router', 'scan_devices'
  ] as Permission[],
  manager: [
    'view_devices', 'edit_devices', 'delete_devices',
    'view_software', 'edit_software', 'delete_software',
    'view_reports',
    'view_network', 'manage_network', 'block_websites',
    'configure_router', 'scan_devices'
  ] as Permission[],
  viewer: [
    'view_devices',
    'view_software',
    'view_reports',
    'view_network'
  ] as Permission[]
};

// Pages accessible by role
const ROLE_PAGES = {
  admin: ['/', '/devices', '/map', '/prohibited-software', '/router-setup', '/global-blocking', '/settings', '/reports'],
  manager: ['/', '/devices', '/map', '/prohibited-software', '/router-setup', '/global-blocking', '/reports'],
  viewer: ['/', '/devices', '/map', '/prohibited-software', '/reports']
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
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
    
    // Store auth data based on remember me selection
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
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