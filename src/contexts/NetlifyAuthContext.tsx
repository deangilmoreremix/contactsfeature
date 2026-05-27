import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Netlify Identity types
interface NetlifyUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  app_metadata?: {
    provider?: string;
    [key: string]: unknown;
  };
  created_at?: string;
  updated_at?: string;
}

interface NetlifyIdentity {
  init: () => void;
  open: () => Promise<void>;
  logout: () => Promise<void>;
  currentUser: () => NetlifyUser | null;
  on: (event: string, callback: (user?: NetlifyUser) => void) => void;
  off: (event: string, callback: (user?: NetlifyUser) => void) => void;
}

declare global {
  interface Window {
    netlifyIdentity: NetlifyIdentity;
  }
}

interface NetlifyAuthContextValue {
  user: NetlifyUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const NetlifyAuthContext = createContext<NetlifyAuthContextValue | null>(null);

export const useNetlifyAuth = () => {
  const context = useContext(NetlifyAuthContext);
  if (!context) {
    throw new Error('useNetlifyAuth must be used within a NetlifyAuthProvider');
  }
  return context;
};

export const NetlifyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<NetlifyUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isNetlifyIdentityAvailable = typeof window !== 'undefined' && 
    window.netlifyIdentity !== undefined;

  const initNetlifyIdentity = useCallback(() => {
    if (!isNetlifyIdentityAvailable) return;

    const netlifyIdentity = window.netlifyIdentity;
    
    const handleLogin = (u: NetlifyUser) => {
      setUser(u);
      setIsLoggedIn(true);
    };

    const handleLogout = () => {
      setUser(null);
      setIsLoggedIn(false);
    };

    const handleError = (err: Error) => {
      console.error('Netlify Identity error:', err);
    };

    netlifyIdentity.on('login', handleLogin);
    netlifyIdentity.on('logout', handleLogout);
    netlifyIdentity.on('error', handleError);
    
    netlifyIdentity.init();
  }, [isNetlifyIdentityAvailable]);

  const checkAuthState = useCallback(async () => {
    if (!isNetlifyIdentityAvailable) {
      setIsLoading(false);
      return;
    }

    const netlifyIdentity = window.netlifyIdentity;
    const currentUser = netlifyIdentity.currentUser();
    
    if (currentUser) {
      setUser(currentUser);
      setIsLoggedIn(true);
    }
    
    setIsLoading(false);
  }, [isNetlifyIdentityAvailable]);

  useEffect(() => {
    initNetlifyIdentity();
    checkAuthState();
  }, [initNetlifyIdentity, checkAuthState]);

  const login = useCallback(async () => {
    if (!isNetlifyIdentityAvailable) {
      window.location.href = '/auth/login';
      return;
    }

    const netlifyIdentity = window.netlifyIdentity;
    return netlifyIdentity.open();
  }, [isNetlifyIdentityAvailable]);

  const logout = useCallback(async () => {
    if (!isNetlifyIdentityAvailable) {
      window.location.href = '/auth/logout';
      return;
    }

    const netlifyIdentity = window.netlifyIdentity;
    return netlifyIdentity.logout();
  }, [isNetlifyIdentityAvailable]);

  const getToken = useCallback(async () => {
    if (!isNetlifyIdentityAvailable) {
      return null;
    }

    const netlifyIdentity = window.netlifyIdentity;
    const currentUser = netlifyIdentity.currentUser();
    
    if (currentUser && typeof currentUser.jwt === 'function') {
      return currentUser.jwt();
    }
    
    return null;
  }, [isNetlifyIdentityAvailable]);

  return (
    <NetlifyAuthContext.Provider value={{ user, isLoggedIn, isLoading, login, logout, getToken }}>
      {children}
    </NetlifyAuthContext.Provider>
  );
};