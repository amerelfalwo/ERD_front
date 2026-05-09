import { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user) {
      api.getMe().then((profile) => {
        localStorage.setItem('erp_user', JSON.stringify(profile));
        setUser(profile);
      }).catch(() => {});
    }
  }, [user]);

  const updateTenantContext = (newTenantData) => {
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
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateTenantContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
