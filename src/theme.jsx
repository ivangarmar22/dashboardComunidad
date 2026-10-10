import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Los colores viven en global.css; Chart.js necesita valores concretos, así que se leen aquí
const STORAGE_KEY = 'dashboard-theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');
const ThemeContext = createContext(null);

function readStoredMode() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function applyMode(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Almacenamiento no disponible
  }
}

function readTokens() {
  const style = getComputedStyle(document.documentElement);
  const v = (name) => style.getPropertyValue(name).trim();
  return {
    surface: v('--surface'),
    ink: v('--ink'),
    muted: v('--ink-3'),
    grid: v('--grid'),
    baseline: v('--baseline'),
    comunes: v('--c-comunes'),
    portales: v('--c-portales'),
    neutral: v('--c-neutral'),
    warn: v('--warn-mark'),
    ramp2: parseFloat(v('--ramp-2')) / 100 || 0.72,
    ramp3: parseFloat(v('--ramp-3')) / 100 || 0.5,
    fontSans: v('--font-sans'),
  };
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);
  const [tokens, setTokens] = useState(readTokens);

  useEffect(() => {
    const query = darkQuery();
    const onChange = (event) => {
      setSystemDark(event.matches);
      setTokens(readTokens());
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  const toggle = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark';
    applyMode(next);
    setMode(next);
    setTokens(readTokens());
  }, [resolved]);

  const value = useMemo(() => ({ resolved, tokens, toggle }), [resolved, tokens, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
