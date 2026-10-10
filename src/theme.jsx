import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Los colores viven en global.css; Chart.js necesita valores concretos, así que se leen aquí.
// Claro por defecto: el oscuro solo se aplica si se elige con el botón.
const STORAGE_KEY = 'dashboard-theme';
const ThemeContext = createContext(null);

function readStoredMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyMode(mode) {
  const root = document.documentElement;
  if (mode === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  try {
    if (mode === 'dark') localStorage.setItem(STORAGE_KEY, 'dark');
    else localStorage.removeItem(STORAGE_KEY);
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
  const [resolved, setResolved] = useState(readStoredMode);
  const [tokens, setTokens] = useState(readTokens);

  const toggle = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark';
    applyMode(next);
    setResolved(next);
    setTokens(readTokens());
  }, [resolved]);

  const value = useMemo(() => ({ resolved, tokens, toggle }), [resolved, tokens, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
