import { useCallback, useEffect, useRef, useState } from 'react';

// Cache en memoria: al volver a una vista se pinta lo último y se refresca detrás
const cache = new Map();
// Dos componentes que piden lo mismo a la vez comparten la petición
const pending = new Map();

async function requestJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Respuesta no válida del servidor (HTTP ${res.status})`);
  }
  if (!res.ok || json.success === false) throw new Error(json.error || `Error HTTP ${res.status}`);
  return json;
}

function sharedRequest(key, url, method, body) {
  if (!pending.has(key)) {
    pending.set(
      key,
      requestJson(url, method, body).finally(() => pending.delete(key)),
    );
  }
  return pending.get(key);
}

/**
 * @param {string|null} url  null para no pedir nada
 * @param {{ method?: string, body?: object, refreshInterval?: number }} options
 */
export function useFetch(url, { method = 'GET', body, refreshInterval = 0 } = {}) {
  const key = url ? `${method} ${url} ${body ? JSON.stringify(body) : ''}` : null;
  const [state, setState] = useState(() => ({
    data: key ? (cache.get(key) ?? null) : null,
    error: null,
    loading: Boolean(key && !cache.has(key)),
    refreshing: false,
  }));
  const latestLoad = useRef(0);
  const bodyRef = useRef(body);

  useEffect(() => {
    bodyRef.current = body;
  });

  const load = useCallback(
    async ({ silent = false, isActive = () => true } = {}) => {
      if (!key) return;
      const loadId = ++latestLoad.current;
      const hasCached = cache.has(key);

      // Lo ya pintado se mantiene atenuado mientras llega lo nuevo
      if (!silent) {
        setState((s) => ({
          data: hasCached ? cache.get(key) : s.data,
          error: null,
          loading: !hasCached && !s.data,
          refreshing: hasCached || Boolean(s.data),
        }));
      }

      const isCurrent = () => isActive() && loadId === latestLoad.current;
      try {
        const json = await sharedRequest(key, url, method, bodyRef.current);
        cache.set(key, json);
        if (isCurrent()) setState({ data: json, error: null, loading: false, refreshing: false });
      } catch (err) {
        if (isCurrent()) {
          setState((s) => ({ ...s, error: err.message, loading: false, refreshing: false }));
        }
      }
    },
    [key, url, method],
  );

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    load({ isActive });
    const id =
      refreshInterval > 0
        ? setInterval(() => load({ silent: true, isActive }), refreshInterval)
        : null;
    return () => {
      active = false;
      if (id) clearInterval(id);
    };
  }, [load, refreshInterval]);

  return state;
}
