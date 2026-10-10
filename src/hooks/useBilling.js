import { useMemo } from 'react';
import { useFetch } from './useFetch.js';
import { enrichInvoices } from '../utils/analytics.js';

// Facturas de zonas comunes, de la más reciente a la más antigua, con €/kWh
export function useBilling() {
  const { data, loading, error, refreshing } = useFetch('/api/endesa/billing');
  const invoices = useMemo(
    () =>
      enrichInvoices([...(data?.data ?? [])].sort((a, b) => b.fEmision.localeCompare(a.fEmision))),
    [data],
  );
  return { invoices, loading, error, refreshing };
}
