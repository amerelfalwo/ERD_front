import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';

export function useInvoices(partyId = null) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoices(partyId);
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createPurchase = useCallback(async (payload) => {
    const invoice = await api.createPurchaseInvoice(payload);
    setInvoices((prev) => [invoice, ...prev]);
    return invoice;
  }, []);

  const createSale = useCallback(async (payload) => {
    const invoice = await api.createSaleInvoice(payload);
    setInvoices((prev) => [invoice, ...prev]);
    return invoice;
  }, []);

  const update = useCallback(async (invoiceId, payload) => {
    const updated = await api.updateInvoice(invoiceId, payload);
    setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...updated } : inv)));
    return updated;
  }, []);

  const remove = useCallback(async (invoiceId) => {
    await api.deleteInvoice(invoiceId);
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
  }, []);

  const processReturn = useCallback(async (invoiceId, payload) => {
    const result = await api.processReturn(invoiceId, payload);
    await fetch();
    return result;
  }, [fetch]);

  const totalRevenue = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
    [invoices]
  );

  const totalProfit = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.invoice_profit || 0), 0),
    [invoices]
  );

  const totalOutstanding = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0),
    [invoices]
  );

  return {
    invoices, loading, error, refetch: fetch,
    createPurchase, createSale, update, remove, processReturn,
    totalRevenue, totalProfit, totalOutstanding,
  };
}
