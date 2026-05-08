import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useParties(type = null) {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getParties();
      setParties(type ? data.filter((p) => p.party_type === type) : data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (payload) => {
    const party = await api.createParty(payload);
    setParties((prev) => [...prev, party]);
    return party;
  }, []);

  const remove = useCallback(async (partyId) => {
    await api.deleteParty(partyId);
    setParties((prev) => prev.filter((p) => p.id !== partyId));
  }, []);

  const getSummary = useCallback((partyId) => api.getPartySummary(partyId), []);

  return { parties, loading, error, refetch: fetch, create, remove, getSummary };
}
