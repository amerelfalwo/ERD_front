import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('erp_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.getMe().then((profile) => {
      localStorage.setItem('erp_user', JSON.stringify(profile));
      setUser(profile);
      setIsLoading(false);
    }).catch(() => {
      setUser(null);
      setIsLoading(false);
    });
  }, []);

  const updateTenantContext = useCallback((newTenantData) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedUser = {
        ...prev,
        tenant: {
          ...prev.tenant,
          ...newTenantData
        }
      };
      localStorage.setItem('erp_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    updateTenantContext,
  }), [user, updateTenantContext]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
