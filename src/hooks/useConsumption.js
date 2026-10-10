import { useMemo } from 'react';
import { useFetch } from './useFetch.js';
import { IS_STATIC, endpoints } from '../api.js';

const NO_DATA = [];
const REFRESH_MS = 5 * 60 * 1000;

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString('sv-SE');
}

const inRange = (list, from, to) => list.filter((d) => d.date >= from && d.date <= to);

export function useConsumption(contractKey, { days = 400 } = {}) {
  const [start, end] = useMemo(() => [isoDaysAgo(days), isoDaysAgo(0)], [days]);
  const url = IS_STATIC ? endpoints.allDays(contractKey) : endpoints.range(contractKey, start, end);
  const { data, loading, error, refreshing } = useFetch(url, { refreshInterval: REFRESH_MS });

  const list = useMemo(() => {
    const all = data?.data ?? NO_DATA;
    return IS_STATIC ? inRange(all, start, end) : all;
  }, [data, start, end]);

  return { data: list, loading, error, refreshing };
}

// Días de un período de facturación (la API los descarga de Endesa si faltan)
export function usePeriodDays(contractKey, period) {
  const { data, loading, error, refreshing } = useFetch(
    IS_STATIC ? endpoints.allDays(contractKey) : endpoints.period(contractKey),
    IS_STATIC ? {} : { method: 'POST', body: period },
  );

  const days = useMemo(() => {
    const all = data?.data ?? NO_DATA;
    return IS_STATIC ? inRange(all, period.from, period.to) : all;
  }, [data, period.from, period.to]);

  return { days, loading, error, refreshing };
}
