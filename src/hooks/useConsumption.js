import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api';

/**
 * Hook para obtener datos de consumo de Endesa filtrados por rango de fechas.
 *
 * @param {string} service - 'endesa'
 * @param {{ start: string, end: string }} dateRange - Rango YYYY-MM-DD
 * @param {number} refreshInterval - Intervalo de refresco en ms (0 = sin refresco)
 * @param {string} contractKey - 'comunes' | 'portales'
 */
export function useConsumption(service, dateRange, refreshInterval = 0, contractKey) {
  const [data, setData] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const basePath = `${API_BASE}/${service}/${contractKey}`;

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const timeout = setTimeout(() => controller.abort(), 120000);

      const params = `start=${dateRange.start}&end=${dateRange.end}`;
      const [rangeRes, monthlyRes] = await Promise.all([
        fetch(`${basePath}/range?${params}`, { signal: controller.signal }),
        fetch(`${basePath}/monthly`, { signal: controller.signal }),
      ]);

      clearTimeout(timeout);

      const rangeData = await rangeRes.json();
      const monthlyData = await monthlyRes.json();

      if (rangeData.success) setData(rangeData.data || []);
      if (monthlyData.success) setMonthly(monthlyData.data || []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [basePath, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return { data, latest, monthly, loading, error, refetch: fetchData };
}
