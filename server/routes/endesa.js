import { Router } from 'express';
import { readData, getDataByRange, appendData } from '../utils/dataStore.js';
import { scrapeEndesa, scrapeEndesaPeriods, scrapeEndesaByPeriod } from '../scrapers/endesa-scraper.js';
import { getContract, getAllContracts, BILLING_CONFIG } from '../config/endesa-contracts.js';
import { fetchBillingHistory } from '../scrapers/endesa-billing-scraper.js';

const router = Router();

const SCRAPE_TIMEOUT = 90000; // 90 segundos máximo para scraping

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de scraping')), ms)),
  ]);
}

// Middleware: resolver contractKey a contractConfig
function resolveContract(req, res, next) {
  try {
    req.contractConfig = getContract(req.params.contractKey);
    next();
  } catch {
    res.status(400).json({ success: false, error: `Contrato no válido: ${req.params.contractKey}` });
  }
}

// GET /api/endesa/contracts - Lista de contratos disponibles
router.get('/contracts', (_req, res) => {
  res.json({ success: true, contracts: getAllContracts() });
});

// GET /api/endesa/billing - Historial de facturas
router.get('/billing', async (_req, res) => {
  try {
    const dataFile = BILLING_CONFIG.dataFile;
    let data = readData(dataFile);

    if (data.length === 0) {
      console.log('[Endesa/Billing] Sin datos locales, obteniendo facturas...');
      try {
        const invoices = await withTimeout(fetchBillingHistory(), SCRAPE_TIMEOUT);
        if (invoices.length > 0) {
          const result = appendData(dataFile, invoices, 'numFact');
          console.log(`[Endesa/Billing] Guardadas ${result.added} facturas (total: ${result.total})`);
          data = readData(dataFile);
        }
      } catch (fetchErr) {
        console.error('[Endesa/Billing] Error:', fetchErr.message);
      }
    }

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/endesa/billing/refresh - Forzar recarga de facturas
router.post('/billing/refresh', async (_req, res) => {
  try {
    const invoices = await fetchBillingHistory();
    const result = appendData(BILLING_CONFIG.dataFile, invoices, 'numFact');
    const data = readData(BILLING_CONFIG.dataFile);
    res.json({ success: true, data, count: data.length, added: result.added });
  } catch (err) {
    console.error('[Endesa/Billing] Error refresh:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/endesa/:contractKey - Todos los datos de consumo eléctrico
router.get('/:contractKey', resolveContract, (req, res) => {
  try {
    const data = readData(req.contractConfig.dataFile);
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/endesa/:contractKey/latest - Último día de consumo
router.get('/:contractKey/latest', resolveContract, (req, res) => {
  try {
    const data = readData(req.contractConfig.dataFile);
    const latest = data.length > 0 ? data[data.length - 1] : null;
    res.json({ success: true, data: latest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/endesa/:contractKey/periods - Lista de períodos de facturación
router.get('/:contractKey/periods', resolveContract, async (req, res) => {
  try {
    if (!req.contractConfig.clientId || !req.contractConfig.contractId) {
      console.log(`[Endesa/${req.contractConfig.key}] Sin CLIENT_ID/CONTRACT_ID configurados, no se pueden obtener períodos`);
      return res.json({ success: true, periods: [] });
    }
    const result = await withTimeout(scrapeEndesaPeriods(req.contractConfig), SCRAPE_TIMEOUT);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[Endesa/${req.contractConfig.key}] Error obteniendo períodos:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/endesa/:contractKey/period - Obtener datos de un período específico
router.post('/:contractKey/period', resolveContract, async (req, res) => {
  try {
    const period = req.body;
    if (!period || !period.from || !period.to) {
      return res.status(400).json({ success: false, error: 'Objeto período requerido con from y to' });
    }

    const dataFile = req.contractConfig.dataFile;

    // Calcular días esperados en el período
    const expectedDays = Math.round(
      (new Date(period.to) - new Date(period.from)) / (1000 * 60 * 60 * 24)
    ) + 1;
    let data = getDataByRange(dataFile, period.from, period.to);

    // Si faltan datos locales (menos del 90% de días esperados) y hay credenciales, pedir a Endesa
    if (data.length < expectedDays * 0.9 && req.contractConfig.clientId && req.contractConfig.contractId) {
      console.log(`[Endesa/${req.contractConfig.key}] Datos locales incompletos para período ${period.from} - ${period.to} (${data.length}/${expectedDays} días), pidiendo a Endesa...`);
      try {
        const fetched = await withTimeout(scrapeEndesaByPeriod(period, req.contractConfig), SCRAPE_TIMEOUT);
        if (fetched.length > 0) {
          const result = appendData(dataFile, fetched, 'date');
          console.log(`[Endesa/${req.contractConfig.key}] Guardados ${result.added} nuevos días (total: ${result.total})`);
          data = fetched;
        }
      } catch (fetchErr) {
        console.error(`[Endesa/${req.contractConfig.key}] Error pidiendo período: ${fetchErr.message}`);
        // Si falla el fetch pero tenemos datos locales parciales, usarlos
      }
    } else if (data.length < expectedDays * 0.9) {
      console.log(`[Endesa/${req.contractConfig.key}] Sin CLIENT_ID/CONTRACT_ID configurados, omitiendo fetch de período`);
    }

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/endesa/:contractKey/range?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:contractKey/range', resolveContract, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'Parámetros start y end requeridos' });
    }

    let data = getDataByRange(req.contractConfig.dataFile, start, end);

    // Si no hay datos locales y hay credenciales configuradas, obtener desde Endesa
    if (data.length === 0 && req.contractConfig.clientId && req.contractConfig.contractId) {
      console.log(`[Endesa/${req.contractConfig.key}] Sin datos locales, obteniendo datos recientes...`);
      try {
        const fetched = await withTimeout(scrapeEndesa(req.contractConfig), SCRAPE_TIMEOUT);
        if (fetched.length > 0) {
          const result = appendData(req.contractConfig.dataFile, fetched, 'date');
          console.log(`[Endesa/${req.contractConfig.key}] Guardados ${result.added} nuevos días (total: ${result.total})`);
          data = fetched.filter(d => d.date >= start && d.date <= end);
        }
      } catch (fetchErr) {
        console.error(`[Endesa/${req.contractConfig.key}] Error obteniendo datos recientes: ${fetchErr.message}`);
      }
    } else if (data.length === 0) {
      console.log(`[Endesa/${req.contractConfig.key}] Sin datos locales y sin CLIENT_ID/CONTRACT_ID configurados, omitiendo auto-fetch`);
    }

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/endesa/:contractKey/monthly - Resumen mensual
router.get('/:contractKey/monthly', resolveContract, (req, res) => {
  try {
    const data = readData(req.contractConfig.dataFile);
    const monthly = {};

    data.forEach((record) => {
      const month = record.date.substring(0, 7);
      if (!monthly[month]) {
        monthly[month] = { month, totalKwh: 0, days: 0 };
      }
      monthly[month].totalKwh += record.totalKwh;
      monthly[month].days += 1;
    });

    const result = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
