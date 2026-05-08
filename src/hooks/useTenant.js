import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useTenant() {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyTenant();
      setTenant(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(async (payload) => {
    const updated = await api.updateSettings(payload);
    setTenant((prev) => ({ ...prev, ...updated }));
    return updated;
  }, []);

  const updateLogo = useCallback(async (logoUrl) => {
    const updated = await api.updateTenantLogo(logoUrl);
    setTenant((prev) => ({ ...prev, logo_url: logoUrl, ...updated }));
    return updated;
  }, []);

  return { tenant, loading, error, refetch: fetch, update, updateLogo };
}
