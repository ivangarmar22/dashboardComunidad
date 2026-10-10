// Las lecturas horarias van de 1 a 24 y marcan el final del tramo: la hora 1 es 00:00-01:00

import { parseISODate } from './format.js';

// La CNMC solo considera valle todo el día los festivos nacionales de fecha fija
const NATIONAL_HOLIDAYS = new Set([
  '01-01',
  '01-06',
  '05-01',
  '08-15',
  '10-12',
  '11-01',
  '12-06',
  '12-08',
  '12-25',
]);

export const TARIFF_PERIODS = [
  { id: 'P1', label: 'Punta', hours: '10–14 h y 18–22 h' },
  { id: 'P2', label: 'Llano', hours: '8–10 h, 14–18 h y 22–24 h' },
  { id: 'P3', label: 'Valle', hours: '0–8 h, fines de semana y festivos' },
];

const sum = (items, fn) => items.reduce((total, x) => total + (fn(x) || 0), 0);
const hasHourly = (day) => day.hourly?.some((h) => h.kwh > 0);

export function isValleDay(date) {
  const weekday = parseISODate(date).getDay();
  return weekday === 0 || weekday === 6 || NATIONAL_HOLIDAYS.has(date.slice(5, 10));
}

/** Periodo 2.0TD de una hora (1-24) en una fecha */
export function tariffPeriod(date, hour) {
  const start = hour - 1;
  if (isValleDay(date) || start < 8) return 'P3';
  if ((start >= 10 && start < 14) || (start >= 18 && start < 22)) return 'P1';
  return 'P2';
}

// `baseLoadKw` es el consumo de fondo: la media del mínimo horario de cada día
export function summarize(days) {
  if (!days?.length) return null;

  const totalKwh = sum(days, (d) => d.totalKwh);
  const withHourly = days.filter(hasHourly);
  let baseLoadKw = null;
  let baseShare = null;
  let peak = null;

  if (withHourly.length > 0) {
    baseLoadKw =
      sum(withHourly, (d) => Math.min(...d.hourly.map((h) => h.kwh))) / withHourly.length;
    const hourlyTotal = sum(withHourly, (d) => d.totalKwh);
    baseShare = hourlyTotal > 0 ? (baseLoadKw * 24 * withHourly.length) / hourlyTotal : null;

    for (const d of withHourly) {
      for (const h of d.hourly) {
        if (!peak || h.kwh > peak.kwh) peak = { kwh: h.kwh, date: d.date, hour: h.hour };
      }
    }
  }

  return {
    days: days.length,
    totalKwh,
    avgKwh: totalKwh / days.length,
    baseLoadKw,
    baseShare,
    peak,
    maxDay: days.reduce((a, b) => (b.totalKwh > a.totalKwh ? b : a)),
  };
}

export function tariffBreakdown(days) {
  const totals = { P1: 0, P2: 0, P3: 0 };
  for (const d of days.filter(hasHourly)) {
    for (const h of d.hourly) totals[tariffPeriod(d.date, h.hour)] += h.kwh;
  }
  const total = totals.P1 + totals.P2 + totals.P3;
  return TARIFF_PERIODS.map((p) => ({
    ...p,
    kwh: totals[p.id],
    share: total > 0 ? totals[p.id] / total : 0,
  }));
}

/** Perfil horario medio, separando laborables de fines de semana y festivos */
export function hourlyProfile(days) {
  const buckets = {
    laborable: { sums: Array(24).fill(0), n: 0 },
    festivo: { sums: Array(24).fill(0), n: 0 },
  };
  for (const d of days.filter(hasHourly)) {
    const bucket = isValleDay(d.date) ? buckets.festivo : buckets.laborable;
    bucket.n++;
    for (const h of d.hourly) bucket.sums[h.hour - 1] += h.kwh;
  }
  const average = (b) => (b.n > 0 ? b.sums.map((s) => s / b.n) : null);
  return {
    laborable: average(buckets.laborable),
    festivo: average(buckets.festivo),
    nLaborable: buckets.laborable.n,
    nFestivo: buckets.festivo.n,
  };
}

export function previousWindow(allDays, from, length) {
  return allDays.filter((d) => d.date < from).slice(-length);
}

export function change(current, previous) {
  if (current == null || !previous) return null;
  return (current - previous) / previous;
}

export function monthlyFromDays(days) {
  const months = new Map();
  for (const d of days) {
    const key = d.date.slice(0, 7);
    const m = months.get(key) ?? { month: key, totalKwh: 0, days: 0 };
    m.totalKwh += d.totalKwh || 0;
    m.days++;
    months.set(key, m);
  }
  return [...months.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => {
      const [y, mm] = m.month.split('-').map(Number);
      const daysInMonth = new Date(y, mm, 0).getDate();
      return { ...m, avgKwh: m.totalKwh / m.days, complete: m.days >= daysInMonth - 1 };
    });
}

export function daysBetween(from, to) {
  return Math.round((parseISODate(to) - parseISODate(from)) / 86400000);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Precio por unidad y aviso si se aleja más de un 35 % de la mediana
export function enrichInvoices(invoices) {
  const priced = invoices.map((inv) => ({
    ...inv,
    pricePerKwh: inv.consumo > 0 ? inv.importe / inv.consumo : null,
  }));
  const med = median(priced.map((i) => i.pricePerKwh).filter((p) => p != null));

  return priced.map((inv) => {
    const deviation = med && inv.pricePerKwh != null ? inv.pricePerKwh / med - 1 : null;
    return {
      ...inv,
      priceDeviation: deviation,
      isOutlier: deviation != null && Math.abs(deviation) > 0.35,
    };
  });
}

// Precio medio solo con las facturas que tienen consumo: las pendientes lo inflarían
export function averagePrice(invoices) {
  const priced = invoices.filter((i) => i.consumo > 0);
  const consumo = sum(priced, (i) => i.consumo);
  return consumo > 0 ? sum(priced, (i) => i.importe) / consumo : null;
}

/** Totales de facturas ya enriquecidas con `enrichInvoices` */
export function invoiceStats(invoices) {
  if (!invoices.length) return null;
  const totalImporte = sum(invoices, (i) => i.importe);
  const totalConsumo = sum(invoices, (i) => i.consumo);
  return {
    count: invoices.length,
    totalImporte,
    totalConsumo,
    avgPrice: averagePrice(invoices),
    outliers: invoices.filter((i) => i.isOutlier),
  };
}

export const takeLast = (list, count) => (Number.isFinite(count) ? list.slice(-count) : list);

// Último año contado desde el dato más reciente, no desde hoy (YYYY-MM o YYYY-MM-DD)
export function lastTwelveMonths(list, getDate) {
  if (list.length === 0) return list;
  const latest = getDate(list.at(-1));
  const [y, m, d] = latest.split('-').map(Number);
  const from =
    latest.length === 7
      ? new Date(y, m - 12, 1).toLocaleDateString('sv-SE').slice(0, 7)
      : new Date(y - 1, m - 1, d + 1).toLocaleDateString('sv-SE');
  return list.filter((item) => getDate(item) >= from);
}

const isoDate = (date) => date.toLocaleDateString('sv-SE');

const addDays = (iso, days) => {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};

// Sin `desde`, el período empieza donde acabó la factura anterior (al día siguiente en el agua)
export function periodsFromInvoices(invoices, { inclusiveDays = false } = {}) {
  return invoices.map((inv, idx) => {
    const older = invoices[idx + 1];
    let from =
      inv.desde ?? (older?.hasta ? addDays(older.hasta, inclusiveDays ? 1 : 0) : older?.fEmision);
    if (!from) {
      const d = parseISODate(inv.fEmision);
      d.setDate(d.getDate() - 30);
      from = isoDate(d);
    }
    return {
      from,
      to: inv.hasta ?? inv.fEmision,
      consumption: inv.consumo,
      importe: inv.importe,
      numFact: inv.numFact,
      emitted: inv.fEmision,
      uso: inv.uso,
      days: daysBetween(from, inv.hasta ?? inv.fEmision) + (inclusiveDays ? 1 : 0),
      isCurrent: idx === 0,
      isBilling: true,
    };
  });
}

// Un período por mes con lecturas diarias, del más reciente al más antiguo
export function periodsFromDays(days) {
  const currentMonth = isoDate(new Date()).slice(0, 7);
  return monthlyFromDays(days)
    .reverse()
    .map((m) => {
      const inMonth = days.filter((d) => d.date.startsWith(m.month));
      return {
        from: inMonth[0].date,
        to: inMonth.at(-1).date,
        consumption: m.totalKwh,
        isCurrent: m.month === currentMonth,
      };
    });
}
