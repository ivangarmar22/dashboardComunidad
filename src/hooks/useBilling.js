import { useMemo } from 'react';
import { useFetch } from './useFetch.js';
import { enrichInvoices } from '../utils/analytics.js';
import { endpoints } from '../api.js';

export function useBilling() {
  const { data, loading, error, refreshing } = useFetch(endpoints.billing());
  const invoices = useMemo(
    () =>
      enrichInvoices([...(data?.data ?? [])].sort((a, b) => b.fEmision.localeCompare(a.fEmision))),
    [data],
  );
  return { invoices, loading, error, refreshing };
}
