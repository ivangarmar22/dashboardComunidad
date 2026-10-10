import { useEffect, useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { endpoints } from '../api.js';
import { fmtRelative, fmtDayMonth } from '../utils/format.js';

function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function describe(data, now) {
  const sources = [...data.contracts, data.billing];
  const configured = sources.filter((s) => s.configured);
  const lastSuccess = configured
    .map((s) => s.lastSuccess)
    .filter(Boolean)
    .sort()
    .at(-1);
  const lastReading = data.contracts
    .map((c) => c.to)
    .filter(Boolean)
    .sort()
    .at(-1);
  const errors = configured.filter(
    (s) => s.lastError && (!s.lastSuccess || s.lastErrorAt > s.lastSuccess),
  );
  const staleMs = (data.intervalHours || 6) * 2 * 60 * 60 * 1000;

  const title = [
    lastReading && `Última lectura: ${lastReading}`,
    ...errors.map((e) => `${e.label ?? 'Facturas'}: ${e.lastError}`),
  ]
    .filter(Boolean)
    .join('\n');

  if (sources.some((s) => s.running)) return { state: 'is-running', text: 'Sincronizando…', title };
  if (configured.length === 0) {
    const text = lastReading ? `Datos guardados hasta el ${fmtDayMonth(lastReading)}` : 'Sin datos';
    return { state: 'is-stale', text, title };
  }
  if (errors.length > 0) {
    const text = lastSuccess
      ? `Error al sincronizar · último OK ${fmtRelative(lastSuccess, now)}`
      : 'Error al sincronizar';
    return { state: 'is-error', text, title };
  }
  if (!lastSuccess) return { state: 'is-stale', text: 'Pendiente de sincronizar', title };

  const stale = now - new Date(lastSuccess).getTime() > staleMs;
  return {
    state: stale ? 'is-stale' : '',
    text: `Actualizado ${fmtRelative(lastSuccess, now)}`,
    title,
  };
}

function SyncStatus() {
  const { data } = useFetch(endpoints.status(), { refreshInterval: 60000 });
  const now = useNow(60000);
  if (!data) return null;

  const { state, text, title } = describe(data, now);
  return (
    <div className="sync-status" title={title || undefined}>
      <span className={`sync-dot ${state}`} aria-hidden="true" />
      <span className="sync-label">{text}</span>
    </div>
  );
}

export default SyncStatus;
