const NBSP = ' ';

const makeFmt = (max, min = 0) =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    useGrouping: 'always',
  });

const fmt0 = makeFmt(0);
const fmt1 = makeFmt(1);
const fmt2 = makeFmt(2);
const fmt3 = makeFmt(3);
const fmtMoney = makeFmt(2, 2);
const fmtPriceFixed = makeFmt(3, 3);

const isValid = (n) => typeof n === 'number' && Number.isFinite(n);
const format = (formatter) => (n) => (isValid(n) ? formatter.format(n) : '--');

/** 1234.56 -> "1.234,56" */
export const fmtNum = format(fmt2);
/** 0.126 -> "0,126" */
export const fmtNum3 = format(fmt3);
/** 213.94 -> "213,9" */
export const fmtNum1 = format(fmt1);
/** 213.94 -> "214" */
export const fmtNum0 = format(fmt0);
/** 1168 -> "1.168,00" */
export const fmtEur = format(fmtMoney);
/** 0.25 -> "0,250" (€/kWh) */
export const fmtPrice = format(fmtPriceFixed);

/** 0.123 -> "12 %", con signo opcional: "+12 %" / "−12 %" */
export function fmtPct(ratio, { signed = false } = {}) {
  if (!isValid(ratio)) return '--';
  const value = fmt0.format(Math.abs(ratio * 100));
  let sign = ratio < 0 ? '−' : '';
  if (signed && ratio > 0) sign = '+';
  return `${sign}${value}${NBSP}%`;
}

/** "YYYY-MM-DD" como fecha local, para que no cambie con la zona horaria del navegador */
export function parseISODate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

const dateFmt = (options) => (iso) =>
  iso ? parseISODate(iso).toLocaleDateString('es-ES', options) : '';

/** "12 mar 2026" */
export const fmtDate = dateFmt({ day: 'numeric', month: 'short', year: 'numeric' });
/** "12 mar" */
export const fmtDayMonth = dateFmt({ day: 'numeric', month: 'short' });
/** "jueves, 12 de marzo" */
export const fmtDateLong = dateFmt({ weekday: 'long', day: 'numeric', month: 'long' });

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "2026-03" -> "mar 26" */
export function fmtMonthShort(month) {
  const [y, m] = month.split('-');
  return `${MONTHS[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`;
}

/** "2026-03" -> "marzo de 2026" */
export function fmtMonthLong(month) {
  const [y, m] = month.split('-');
  return `${MONTHS[Number(m) - 1]} de ${y}`;
}

/** "1 – 9 mar 2026", "28 ene – 3 mar 2026", "28 dic 2025 – 27 ene 2026" */
export function fmtRange(from, to) {
  if (!from || !to) return '';
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (a.getFullYear() !== b.getFullYear()) return `${fmtDate(from)} – ${fmtDate(to)}`;
  if (a.getMonth() !== b.getMonth()) return `${fmtDayMonth(from)} – ${fmtDate(to)}`;
  return `${a.getDate()} – ${fmtDate(to)}`;
}

/** Como fmtRange pero sin año: "1 – 31 dic", "6 ene – 5 feb" */
export function fmtRangeShort(from, to) {
  if (!from || !to) return '';
  const a = parseISODate(from);
  const b = parseISODate(to);
  const sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  return sameMonth
    ? `${a.getDate()} – ${fmtDayMonth(to)}`
    : `${fmtDayMonth(from)} – ${fmtDayMonth(to)}`;
}

/** Hora 1-24 (fin del tramo) -> "00:00–01:00" */
export function fmtHourRange(hour) {
  const pad = (h) => String(h).padStart(2, '0');
  return `${pad(hour - 1)}:00–${pad(hour % 24)}:00`;
}
