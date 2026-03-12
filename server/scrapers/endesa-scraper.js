/**
 * Scraper de Endesa usando Playwright.
 *
 * Soporta múltiples contratos. Cada contrato se identifica por un objeto
 * contractConfig con: clientId, contractId, user, password, cookie, sessionId,
 * cookieCacheFile, dataFile, key, label.
 */

import { chromium } from 'playwright';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URLs de Endesa
const LOGIN_URL = 'https://www.endesa.com/es/login';
const API_BASE = 'https://www.endesaclientes.com';
const OPEN_DETAILS_PATH = '/neolapi-b2c-consumptions-rest/consumptions/opendetails';
const DETAILS_PATH = '/neolapi-b2c-consumptions-rest/consumptions/details';
const PERIOD_LIST_PATH = '/neolapi-b2c-billings-rest/billing/periodlist';
const POST_LOGIN_URL = 'https://www.endesaclientes.com/oficina/gestion-online.html';

function getCachePath(contractConfig) {
  return path.join(__dirname, '..', 'data', contractConfig.cookieCacheFile);
}

/**
 * Convierte YYYY-MM-DD a DD/MM/YYYY (formato Endesa).
 */
function toEndesaDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Convierte DD/MM/YYYY a YYYY-MM-DD.
 */
function convertDateFormat(dateStr) {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr;
}

/**
 * Realiza login en Endesa con Playwright y captura cookies + sessionId.
 */
export async function getEndesaCookies(contractConfig) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    let capturedSessionId = null;
    page.on('request', (request) => {
      const sid = request.headers()['sessionid'];
      if (sid) capturedSessionId = sid;
    });

    console.log(`[Endesa/${contractConfig.key}] Navegando a login...`);
    await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    try {
      const acceptBtn = page.locator('#onetrust-accept-btn-handler');
      if (await acceptBtn.isVisible({ timeout: 3000 })) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);
      }
    } catch { /* No hay banner */ }

    console.log(`[Endesa/${contractConfig.key}] Esperando formulario de login...`);
    await page.waitForSelector('input[type="email"], input[name="email"], #email, input[name="user"]', {
      timeout: 15000,
    });

    const emailInput = page.locator('input[type="email"], input[name="email"], #email, input[name="user"]').first();
    await emailInput.fill(contractConfig.user);

    const passInput = page.locator('input[type="password"], input[name="password"], #password').first();
    await passInput.fill(contractConfig.password);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    console.log(`[Endesa/${contractConfig.key}] Esperando autenticación...`);

    try {
      await page.waitForURL(url => {
        const href = url.toString();
        return href.includes('endesaclientes.com') || href.includes('area-cliente');
      }, { timeout: 45000 });
    } catch {
      console.log(`[Endesa/${contractConfig.key}] Timeout en redirección, continuando...`);
    }

    try {
      await page.goto(POST_LOGIN_URL + '?neolpostlogin=true', {
        waitUntil: 'load',
        timeout: 30000,
      });
      await page.waitForTimeout(5000);
    } catch {
      console.log(`[Endesa/${contractConfig.key}] Timeout en página de consumos, continuando...`);
    }

    const cookies = await context.cookies([
      'https://www.endesa.com',
      'https://www.endesaclientes.com',
    ]);
    console.log(`[Endesa/${contractConfig.key}] Obtenidas ${cookies.length} cookies`);

    await browser.close();

    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    saveCookieCache(contractConfig, { cookieHeader, sessionId: capturedSessionId, timestamp: Date.now() });

    return { cookies, cookieHeader, sessionId: capturedSessionId };
  } catch (error) {
    await browser.close();
    throw new Error(`[Endesa/${contractConfig.key}] Error en login: ${error.message}`);
  }
}

/**
 * Headers comunes para las llamadas a la API de Endesa.
 */
function getApiHeaders(cookieHeader, sessionId) {
  return {
    Cookie: cookieHeader,
    'Content-Type': 'application/json; charset=UTF-8',
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    Origin: 'https://www.endesaclientes.com',
    Referer: 'https://www.endesaclientes.com/oficina/gestion-online.html?neolpostlogin=true',
    'X-Requested-With': 'XMLHttpRequest',
    lang: '1383137899042',
    language: 'es',
    ...(sessionId ? { sessionid: sessionId } : {}),
  };
}

/**
 * Llama al endpoint /opendetails para obtener los últimos ~22 días.
 */
export async function fetchEndesaRecent(cookieHeader, sessionId, contractConfig) {
  if (!contractConfig.clientId || !contractConfig.contractId) {
    throw new Error(`clientId y contractId son requeridos para ${contractConfig.key}`);
  }

  const url = `${API_BASE}${OPEN_DETAILS_PATH}`;
  console.log(`[Endesa/${contractConfig.key}] Pidiendo datos recientes (opendetails)...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: getApiHeaders(cookieHeader, sessionId),
    body: JSON.stringify({ clientId: contractConfig.clientId, contractId: contractConfig.contractId, channel: 'EWEB' }),
  });

  if (!response.ok) {
    throw new Error(`[Endesa/${contractConfig.key}] API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errorCode && data.errorCode !== 'ERR-000') {
    throw new Error(`[Endesa/${contractConfig.key}] API error: ${data.errorDescription || data.errorCode}`);
  }

  console.log(`[Endesa/${contractConfig.key}] Respuesta OK - ${data.consumption?.length || 0} días`);
  return data;
}

/**
 * Obtiene la lista de períodos de facturación desde la API de Endesa.
 */
export async function fetchEndesaPeriods(cookieHeader, sessionId, contractConfig) {
  if (!contractConfig.clientId || !contractConfig.contractId) {
    throw new Error(`clientId y contractId son requeridos para ${contractConfig.key}`);
  }

  const url = `${API_BASE}${PERIOD_LIST_PATH}`;
  console.log(`[Endesa/${contractConfig.key}] Pidiendo lista de períodos de facturación...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: getApiHeaders(cookieHeader, sessionId),
    body: JSON.stringify({ clientId: contractConfig.clientId, contractId: contractConfig.contractId, channel: 'EWEB' }),
  });

  if (!response.ok) {
    throw new Error(`[Endesa/${contractConfig.key}] Periodlist API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errorCode && data.errorCode !== 'ERR-000') {
    throw new Error(`[Endesa/${contractConfig.key}] Periodlist error: ${data.errorDescription || data.errorCode}`);
  }

  const periods = (data.periodList || []).map((p) => ({
    from: convertDateFormat(p.invoicedPeriod.from),
    to: convertDateFormat(p.invoicedPeriod.to),
    isCurrent: p.isCurrentPeriod,
    billSequence: p.billSequence ?? 0,
    codFactAtr: p.codFactAtr,
    contractNumber: p.contractNumber,
    consumption: p.consumption,
    codCompany: p.codCompany,
    billNumber: p.billNumber,
  }));

  console.log(`[Endesa/${contractConfig.key}] ${periods.length} períodos obtenidos`);
  return { periods, consumptionMean: data.consumptionMean };
}

/**
 * Llama al endpoint /details para obtener datos de un período de facturación.
 */
export async function fetchEndesaByPeriod(cookieHeader, sessionId, period, contractConfig) {
  if (!contractConfig.clientId) {
    throw new Error(`clientId es requerido para ${contractConfig.key}`);
  }

  const url = `${API_BASE}${DETAILS_PATH}`;
  const body = {
    billSec: period.billSequence || 0,
    channel: 'EWEB',
    clientId: contractConfig.clientId,
    codCompany: period.codCompany || '20',
    codigoFiscalFactura: period.codFactAtr || '',
    contract: period.contractNumber || '',
    startDate: toEndesaDate(period.from),
    endDate: toEndesaDate(period.to),
  };

  console.log(`[Endesa/${contractConfig.key}] Pidiendo datos del período ${body.startDate} - ${body.endDate} (details)...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: getApiHeaders(cookieHeader, sessionId),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`[Endesa/${contractConfig.key}] API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errorCode && data.errorCode !== 'ERR-000' && data.errorCode !== null) {
    throw new Error(`[Endesa/${contractConfig.key}] API error: ${data.errorDescription || data.errorCode}`);
  }

  console.log(`[Endesa/${contractConfig.key}] Respuesta OK - ${data.consumption?.length || 0} días`);
  return data;
}

/**
 * Parsea la respuesta de la API de Endesa (funciona para ambos endpoints).
 * Usa dayConsum como total (el valor oficial que muestra Endesa).
 */
export function parseEndesaData(apiResponse) {
  const records = [];
  const consumption = apiResponse?.consumption || [];

  consumption.forEach((day) => {
    const date = convertDateFormat(day.date);
    const totalKwh = day.dayConsum || 0;

    const hourlyMap = new Map();
    if (day.barFragments) {
      day.barFragments.forEach((fragment) => {
        if (fragment.fragmentHours) {
          fragment.fragmentHours.forEach((h) => {
            const existing = hourlyMap.get(h.hour) || 0;
            hourlyMap.set(h.hour, existing + (h.hourConsum || 0));
          });
        }
      });
    }

    const hourly = [];
    for (let h = 1; h <= 24; h++) {
      hourly.push({
        hour: h,
        kwh: Math.round((hourlyMap.get(h) || 0) * 1000) / 1000,
      });
    }

    const fragments = (day.barFragments || [])
      .filter((f) => f.fragmentConsum > 0)
      .map((f) => ({
        consum: f.fragmentConsum,
        hours: (f.fragmentHours || []).map((h) => h.hour),
      }));

    records.push({
      date,
      totalKwh: Math.round(totalKwh * 1000) / 1000,
      hourly,
      fragments,
      source: 'endesa',
    });
  });

  records.sort((a, b) => a.date.localeCompare(b.date));
  return records;
}

// --- Cache de cookies por contrato ---

function saveCookieCache(contractConfig, data) {
  try {
    fs.writeFileSync(getCachePath(contractConfig), JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* ignorar */ }
}

function loadCookieCache(contractConfig) {
  try {
    const cachePath = getCachePath(contractConfig);
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }
  } catch { /* ignorar */ }
  return null;
}

/**
 * Obtiene cookies para un contrato: .env manual > cache > Playwright.
 */
export async function getCookiesWithFallback(contractConfig) {
  if (contractConfig.cookie) {
    console.log(`[Endesa/${contractConfig.key}] Usando cookies del .env (modo manual)`);
    return {
      cookieHeader: contractConfig.cookie,
      sessionId: contractConfig.sessionId || null,
    };
  }

  const cached = loadCookieCache(contractConfig);
  if (cached && (Date.now() - cached.timestamp) < 30 * 60 * 1000) {
    console.log(`[Endesa/${contractConfig.key}] Usando cookies cacheadas`);
    return { cookieHeader: cached.cookieHeader, sessionId: cached.sessionId };
  }

  console.log(`[Endesa/${contractConfig.key}] Obteniendo cookies con Playwright...`);
  const result = await getEndesaCookies(contractConfig);
  return { cookieHeader: result.cookieHeader, sessionId: result.sessionId };
}

/**
 * Reintenta con Playwright si las cookies del .env fallan.
 */
async function withCookieRetry(contractConfig, apiFn) {
  const { cookieHeader, sessionId } = await getCookiesWithFallback(contractConfig);
  try {
    return await apiFn(cookieHeader, sessionId);
  } catch (err) {
    if (contractConfig.cookie) {
      console.log(`[Endesa/${contractConfig.key}] Cookies del .env fallaron, reintentando con Playwright...`);
      const fresh = await getEndesaCookies(contractConfig);
      return await apiFn(fresh.cookieHeader, fresh.sessionId);
    }
    throw err;
  }
}

/**
 * Flujo completo: obtener datos recientes (últimos ~22 días).
 */
export async function scrapeEndesa(contractConfig) {
  const raw = await withCookieRetry(contractConfig, (cookie, sid) =>
    fetchEndesaRecent(cookie, sid, contractConfig)
  );
  return parseEndesaData(raw);
}

/**
 * Flujo completo: obtener lista de períodos de facturación.
 */
export async function scrapeEndesaPeriods(contractConfig) {
  return withCookieRetry(contractConfig, (cookie, sid) =>
    fetchEndesaPeriods(cookie, sid, contractConfig)
  );
}

/**
 * Flujo completo: obtener datos de un período de facturación específico.
 */
export async function scrapeEndesaByPeriod(period, contractConfig) {
  const raw = await withCookieRetry(contractConfig, (cookie, sid) =>
    fetchEndesaByPeriod(cookie, sid, period, contractConfig)
  );
  return parseEndesaData(raw);
}
