import { useMemo } from 'react';
import { useFetch } from './useFetch.js';

const NO_DATA = [];
const REFRESH_MS = 5 * 60 * 1000;

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString('sv-SE');
}

// Consumo diario reciente de un contrato; el servidor lo sincroniza en segundo plano
export function useConsumption(contractKey, { days = 400 } = {}) {
  const [start, end] = useMemo(() => [isoDaysAgo(days), isoDaysAgo(0)], [days]);
  const { data, loading, error, refreshing } = useFetch(
    `/api/endesa/${contractKey}/range?start=${start}&end=${end}`,
    { refreshInterval: REFRESH_MS },
  );
  return { data: data?.data ?? NO_DATA, loading, error, refreshing };
}
