import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

type User = {
  username: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, role: string, rememberMe: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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