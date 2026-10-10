/**
 * Sincronización con Endesa. Las rutas leen de disco; un planificador refresca
 * los datos en segundo plano. Cada tarea es single-flight: si ya está en
 * marcha, quien la pide espera a la misma ejecución.
 */

import { readData, readJson, writeJson, upsertData, getDataByRange } from '../utils/dataStore.js';
import {
  scrapeEndesa,
  scrapeEndesaPeriods,
  scrapeEndesaByPeriod,
} from '../scrapers/endesa-scraper.js';
import { fetchBillingHistory } from '../scrapers/endesa-billing-scraper.js';
import CONTRACTS, { BILLING_CONFIG } from '../config/endesa-contracts.js';

const STATUS_FILE = 'sync-status.json';
const PERIODS_MAX_AGE_MS = 12 * 60 * 60 * 1000;
// Endesa publica con 1-2 días de retraso: un período con el 90 % de días se da por completo
const COVERAGE_THRESHOLD = 0.9;

const inFlight = new Map();

function singleFlight(key, fn) {
  if (!inFlight.has(key)) {
    inFlight.set(
      key,
      Promise.resolve()
        .then(fn)
        .finally(() => inFlight.delete(key)),
    );
  }
  return inFlight.get(key);
}

function daysInclusive(from, to) {
  const toUtc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86400000) + 1;
}

const todayIso = () => new Date().toLocaleDateString('sv-SE');
const periodsFile = (cfg) => `endesa-${cfg.key}-periods.json`;

export function hasConsumptionCredentials(cfg) {
  return Boolean(cfg.clientId && cfg.contractId && (cfg.cookie || (cfg.user && cfg.password)));
}

export function hasBillingCredentials(cfg = BILLING_CONFIG) {
  return Boolean(cfg.sfContractId && ((cfg.cookie && cfg.auraToken) || (cfg.user && cfg.password)));
}

function updateStatus(key, patch) {
  const status = readJson(STATUS_FILE, {});
  status[key] = { ...status[key], ...patch };
  writeJson(STATUS_FILE, status);
}

async function tracked(key, fn) {
  updateStatus(key, { lastRun: new Date().toISOString() });
  try {
    const result = await fn();
    updateStatus(key, {
      lastSuccess: new Date().toISOString(),
      lastError: null,
      lastResult: result,
    });
    return result;
  } catch (err) {
    updateStatus(key, { lastError: err.message, lastErrorAt: new Date().toISOString() });
    throw err;
  }
}

function getIntervalHours() {
  const value = Number(process.env.SYNC_INTERVAL_HOURS ?? 6);
  return Number.isFinite(value) && value >= 0 ? value : 6;
}

export function getStatus() {
  const status = readJson(STATUS_FILE, {});

  const contracts = Object.values(CONTRACTS).map((cfg) => {
    const data = readData(cfg.dataFile);
    return {
      key: cfg.key,
      label: cfg.label,
      configured: hasConsumptionCredentials(cfg),
      records: data.length,
      from: data[0]?.date ?? null,
      to: data.at(-1)?.date ?? null,
      ...status[cfg.key],
      running: inFlight.has(`sync:${cfg.key}`),
    };
  });

  const invoices = readData(BILLING_CONFIG.dataFile);
  const billing = {
    key: 'billing',
    configured: hasBillingCredentials(),
    records: invoices.length,
    lastInvoice: invoices[0]?.fEmision ?? null,
    ...status.billing,
    running: inFlight.has('sync:billing'),
  };

  return { contracts, billing, intervalHours: getIntervalHours() };
}

// Último recurso sin acceso a Endesa: un período por mes con los datos locales
function periodsFromLocalData(cfg) {
  const months = new Map();
  for (const d of readData(cfg.dataFile)) {
    const key = d.date.slice(0, 7);
    const m = months.get(key) ?? { from: d.date, to: d.date, totalKwh: 0 };
    if (d.date < m.from) m.from = d.date;
    if (d.date > m.to) m.to = d.date;
    m.totalKwh += d.totalKwh || 0;
    months.set(key, m);
  }

  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, m], i) => ({
      from: m.from,
      to: m.to,
      consumption: Math.round(m.totalKwh * 100) / 100,
      isCurrent: i === 0,
      isLocal: true,
    }));
}

function refreshPeriods(cfg) {
  return singleFlight(`periods:${cfg.key}`, async () => {
    const payload = { fetchedAt: new Date().toISOString(), ...(await scrapeEndesaPeriods(cfg)) };
    writeJson(periodsFile(cfg), payload);
    return payload;
  });
}

// Cache reciente > Endesa > cache antigua > datos locales. Con cache nunca se espera a Endesa.
export async function getPeriods(cfg, { offline = false } = {}) {
  const cached = readJson(periodsFile(cfg), null);
  const canFetch = !offline && hasConsumptionCredentials(cfg);

  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < PERIODS_MAX_AGE_MS) return { ...cached, source: 'cache' };
    if (canFetch) refreshPeriods(cfg).catch(() => {});
    return { ...cached, source: 'stale' };
  }

  if (canFetch) {
    try {
      return { ...(await refreshPeriods(cfg)), source: 'endesa' };
    } catch (err) {
      console.error(`[Sync/${cfg.key}] Error obteniendo períodos: ${err.message}`);
    }
  }

  return { periods: periodsFromLocalData(cfg), consumptionMean: null, source: 'local' };
}

// Zonas comunes no tiene API de consumo: cada factura cubre desde la emisión anterior
function periodsFromBilling() {
  const invoices = [...readData(BILLING_CONFIG.dataFile)].sort((a, b) =>
    b.fEmision.localeCompare(a.fEmision),
  );
  return invoices.map((inv, idx) => {
    let from = invoices[idx + 1]?.fEmision;
    if (!from) {
      const d = new Date(`${inv.fEmision}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 30);
      from = d.toISOString().slice(0, 10);
    }
    return {
      from,
      to: inv.fEmision,
      consumption: inv.consumo,
      isCurrent: idx === 0,
      isBilling: true,
      importe: inv.importe,
      numFact: inv.numFact,
    };
  });
}

// El período en curso primero y el resto del más reciente al más antiguo
export async function listPeriods(cfg, options) {
  let result = await getPeriods(cfg, options);
  if (result.periods.length === 0 && cfg.key === 'comunes') {
    result = { periods: periodsFromBilling(), consumptionMean: null, source: 'billing' };
  }
  const periods = [...result.periods].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return b.from.localeCompare(a.from);
  });
  return { ...result, periods };
}

function isIncomplete(cfg, period) {
  const today = todayIso();
  const to = period.to > today ? today : period.to;
  const have = getDataByRange(cfg.dataFile, period.from, to).length;
  return have < daysInclusive(period.from, to) * COVERAGE_THRESHOLD;
}

async function fetchPeriod(cfg, period) {
  const fetched = await scrapeEndesaByPeriod(period, cfg);
  return upsertData(cfg.dataFile, fetched);
}

export async function ensurePeriodData(cfg, period) {
  if (isIncomplete(cfg, period) && hasConsumptionCredentials(cfg)) {
    try {
      await singleFlight(`period:${cfg.key}:${period.from}:${period.to}`, () =>
        fetchPeriod(cfg, period),
      );
    } catch (err) {
      console.error(`[Sync/${cfg.key}] Error pidiendo el período: ${err.message}`);
    }
  }
  return getDataByRange(cfg.dataFile, period.from, period.to);
}

/**
 * Últimos días + lista de períodos + los dos períodos más recientes si les
 * faltan datos (o todos con `backfill`).
 */
export function syncContract(cfg, { backfill = false } = {}) {
  return singleFlight(`sync:${cfg.key}`, () =>
    tracked(cfg.key, async () => {
      const { added, updated } = upsertData(cfg.dataFile, await scrapeEndesa(cfg));
      const result = { added, updated, periodsFetched: 0 };

      try {
        const { periods } = await refreshPeriods(cfg);
        for (const period of backfill ? periods : periods.slice(0, 2)) {
          if (!isIncomplete(cfg, period)) continue;
          const r = await fetchPeriod(cfg, period);
          result.added += r.added;
          result.updated += r.updated;
          result.periodsFetched++;
        }
      } catch (err) {
        console.error(`[Sync/${cfg.key}] Error con los períodos: ${err.message}`);
      }

      console.log(`[Sync/${cfg.key}] +${result.added} nuevos, ${result.updated} actualizados`);
      return result;
    }),
  );
}

export function syncBilling() {
  return singleFlight('sync:billing', () =>
    tracked('billing', async () => {
      const invoices = await fetchBillingHistory();
      const { added, updated } = upsertData(BILLING_CONFIG.dataFile, invoices, 'numFact', (a, b) =>
        b.fEmision.localeCompare(a.fEmision),
      );
      console.log(`[Sync/billing] +${added} nuevas, ${updated} actualizadas`);
      return { added, updated };
    }),
  );
}

export async function syncAll(options = {}) {
  const jobs = Object.values(CONTRACTS)
    .filter(hasConsumptionCredentials)
    .map((cfg) => [cfg.key, () => syncContract(cfg, options)]);
  if (hasBillingCredentials()) jobs.push(['billing', syncBilling]);

  const results = {};
  for (const [key, job] of jobs) {
    try {
      results[key] = await job();
    } catch (err) {
      results[key] = { error: err.message };
      console.error(`[Sync/${key}] ${err.message}`);
    }
  }
  return results;
}

// SYNC_INTERVAL_HOURS=0 la desactiva. La primera ejecución respeta el último
// éxito para no repetir el login en cada reinicio.
export function startScheduler() {
  const hours = getIntervalHours();
  if (hours === 0) {
    console.log('[Sync] Sincronización automática desactivada');
    return;
  }

  const intervalMs = hours * 60 * 60 * 1000;
  const lastSuccesses = Object.values(readJson(STATUS_FILE, {})).map((s) =>
    new Date(s.lastSuccess ?? 0).getTime(),
  );
  const oldest = lastSuccesses.length ? Math.min(...lastSuccesses) : 0;
  const firstDelay = Math.max(15000, oldest + intervalMs - Date.now());

  const run = () => syncAll().catch((err) => console.error('[Sync]', err.message));
  setTimeout(() => {
    run();
    setInterval(run, intervalMs).unref();
  }, firstDelay).unref();

  console.log(`[Sync] Cada ${hours} h (próxima en ${Math.round(firstDelay / 60000)} min)`);
}
