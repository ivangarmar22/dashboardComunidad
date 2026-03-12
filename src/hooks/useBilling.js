import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

export function useBilling() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/endesa/billing`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data || []);
      } else {
        setError(json.error || 'Error cargando facturas');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return { invoices, loading, error, refetch: fetchInvoices };
}
