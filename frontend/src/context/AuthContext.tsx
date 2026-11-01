import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Merchant } from '../types';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  merchants: Merchant[];
  currentMerchant: Merchant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  createMerchant: (data: {
    business_name: string;
    currency: string;
    category?: string;
    address?: string;
    phone?: string;
  }) => Promise<Merchant>;
  switchMerchant: (merchantId: string) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    return urlParams?.get('token') || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramToken = urlParams.get('token');
    if (paramToken) {
      localStorage.setItem('token', paramToken);
      setToken(paramToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    const savedToken = paramToken || localStorage.getItem('token');
    if (!savedToken) {
      setUser(null);
      setMerchants([]);
      setCurrentMerchant(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await apiClient.getMe();
      setUser(currentUser);

      const userMerchants = await apiClient.getMyMerchants();
      setMerchants(userMerchants);

      const savedMerchantId = localStorage.getItem('current_merchant_id');
      if (savedMerchantId) {
        const found = userMerchants.find((m) => m.id === savedMerchantId);
        if (found) {
          setCurrentMerchant(found);
        } else if (userMerchants.length > 0) {
          setCurrentMerchant(userMerchants[0]);
          localStorage.setItem('current_merchant_id', userMerchants[0].id);
        }
      } else if (userMerchants.length > 0) {
        setCurrentMerchant(userMerchants[0]);
        localStorage.setItem('current_merchant_id', userMerchants[0].id);
      }
    } catch (err) {
      console.error('Session expired or authentication failed:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('current_merchant_id');
      setToken(null);
      setUser(null);
      setMerchants([]);
      setCurrentMerchant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.login({ email, password });
      localStorage.setItem('token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);

      const userMerchants = await apiClient.getMyMerchants();
      setMerchants(userMerchants);
      if (userMerchants.length > 0) {
        setCurrentMerchant(userMerchants[0]);
        localStorage.setItem('current_merchant_id', userMerchants[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.register({ email, password, full_name: fullName });
      localStorage.setItem('token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      setMerchants([]);
      setCurrentMerchant(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('current_merchant_id');
    setToken(null);
    setUser(null);
    setMerchants([]);
    setCurrentMerchant(null);
  };

  const createMerchant = async (data: {
    business_name: string;
    currency: string;
    category?: string;
    address?: string;
    phone?: string;
  }): Promise<Merchant> => {
    const newMerchant = await apiClient.createMerchant(data);
    setMerchants((prev) => [...prev, newMerchant]);
    setCurrentMerchant(newMerchant);
    localStorage.setItem('current_merchant_id', newMerchant.id);
    return newMerchant;
  };

  const switchMerchant = (merchantId: string) => {
    const found = merchants.find((m) => m.id === merchantId);
    if (found) {
      setCurrentMerchant(found);
      localStorage.setItem('current_merchant_id', found.id);
    }
  };

  const refresh = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        merchants,
        currentMerchant,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        createMerchant,
        switchMerchant,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
