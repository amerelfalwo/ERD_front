import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (payload) => {
    const product = await api.createProduct(payload);
    setProducts((prev) => [...prev, product]);
    return product;
  }, []);

  const remove = useCallback(async (productId) => {
    await api.deleteProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const getCostFor = useCallback(
    (productId) => {
      const p = products.find((x) => x.id === productId);
      return p ? (p.current_cost ?? null) : null;
    },
    [products]
  );

  const getSellingPriceFor = useCallback(
    (productId) => {
      const p = products.find((x) => x.id === productId);
      return p ? (p.current_selling_price ?? null) : null;
    },
    [products]
  );

  return { products, loading, error, refetch: fetch, create, remove, getCostFor, getSellingPriceFor };
}
