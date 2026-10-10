import { Router } from 'express';
import { readData, getDataByRange } from '../utils/dataStore.js';
import { getContract, BILLING_CONFIG } from '../config/endesa-contracts.js';
import {
  listPeriods,
  ensurePeriodData,
  syncContract,
  syncBilling,
  hasConsumptionCredentials,
  hasBillingCredentials,
} from '../services/sync.js';

const router = Router();

// Máximo que una petición espera a Endesa; la tarea sigue en segundo plano
const SCRAPE_TIMEOUT_MS = 60000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout esperando a Endesa')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function resolveContract(req, res, next) {
  try {
    req.contractConfig = getContract(req.params.contractKey);
    next();
  } catch {
    res
      .status(400)
      .json({ success: false, error: `Contrato no válido: ${req.params.contractKey}` });
  }
}

function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.get('x-admin-token') === token) return next();
  res.status(401).json({ success: false, error: 'No autorizado' });
}

router.get('/billing', async (_req, res) => {
  let data = readData(BILLING_CONFIG.dataFile);

  if (data.length === 0 && hasBillingCredentials()) {
    try {
      await withTimeout(syncBilling(), SCRAPE_TIMEOUT_MS);
      data = readData(BILLING_CONFIG.dataFile);
    } catch (err) {
      console.error('[API/billing]', err.message);
    }
  }

  res.json({ success: true, data, count: data.length });
});

router.post('/billing/refresh', requireAdmin, async (_req, res) => {
  const result = await syncBilling();
  const data = readData(BILLING_CONFIG.dataFile);
  res.json({ success: true, data, count: data.length, ...result });
});

router.get('/:contractKey/periods', resolveContract, async (req, res) => {
  res.json({ success: true, ...(await listPeriods(req.contractConfig)) });
});

router.post('/:contractKey/period', resolveContract, async (req, res) => {
  const period = req.body;
  if (!ISO_DATE.test(period?.from) || !ISO_DATE.test(period?.to)) {
    return res
      .status(400)
      .json({ success: false, error: 'Se requiere un período con from y to (YYYY-MM-DD)' });
  }

  const cfg = req.contractConfig;
  let data;
  try {
    data = await withTimeout(ensurePeriodData(cfg, period), SCRAPE_TIMEOUT_MS);
  } catch {
    data = getDataByRange(cfg.dataFile, period.from, period.to);
  }

  res.json({ success: true, data, count: data.length });
});

router.get('/:contractKey/range', resolveContract, async (req, res) => {
  const { start, end } = req.query;
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) {
    return res
      .status(400)
      .json({ success: false, error: 'Parámetros start y end requeridos (YYYY-MM-DD)' });
  }

  const cfg = req.contractConfig;
  let data = getDataByRange(cfg.dataFile, start, end);

  // Primera ejecución sin datos: se espera a una sincronización
  if (data.length === 0 && hasConsumptionCredentials(cfg)) {
    try {
      await withTimeout(syncContract(cfg), SCRAPE_TIMEOUT_MS);
      data = getDataByRange(cfg.dataFile, start, end);
    } catch (err) {
      console.error(`[API/${cfg.key}]`, err.message);
    }
  }

  res.json({ success: true, data, count: data.length });
});

router.post('/:contractKey/refresh', requireAdmin, resolveContract, async (req, res) => {
  if (!hasConsumptionCredentials(req.contractConfig)) {
    return res
      .status(400)
      .json({ success: false, error: 'Contrato sin credenciales configuradas' });
  }
  const result = await syncContract(req.contractConfig);
  res.json({ success: true, ...result });
});

export default router;
