/**
 * Utilidades de formato en español.
 * Todos los números usan coma como separador decimal.
 */

const numFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

const numFmt3 = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
  useGrouping: 'always',
});

const numFmt1 = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
  useGrouping: 'always',
});

/** Formatea un número con 2 decimales max: 1234.56 -> "1.234,56" */
export function fmtNum(n) {
  if (n == null || isNaN(n)) return '--';
  return numFmt.format(n);
}

/** Formatea con 3 decimales: 0.126 -> "0,126" */
export function fmtNum3(n) {
  if (n == null || isNaN(n)) return '--';
  return numFmt3.format(n);
}

/** Formatea con 1 decimal: 213.9 -> "213,9" */
export function fmtNum1(n) {
  if (n == null || isNaN(n)) return '--';
  return numFmt1.format(n);
}

/** Formatea fecha YYYY-MM-DD a "12 mar 2026" */
export function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Formatea fecha YYYY-MM-DD a "12/03" (día/mes) */
export function fmtDateShort(d) {
  if (!d) return '';
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}`;
}
