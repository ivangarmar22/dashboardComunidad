/**
 * Cliente de la API del área cliente de Endesa. Playwright solo se usa para
 * iniciar sesión y capturar cookies + sessionId; los datos se piden a la API JSON.
 */

import { readJson, writeJson } from '../utils/dataStore.js';
import { BASE_UA, acceptCookies, launchBrowser, waitForLoginToLeave } from './browser.js';

const API_BASE = 'https://www.endesaclientes.com';
const LOGIN_URL = `${API_BASE}/login.html?d=Any`;
const POST_LOGIN_URL = `${API_BASE}/oficina/gestion-online.html?neolpostlogin=true`;
const PATHS = {
  recent: '/neolapi-b2c-consumptions-rest/consumptions/opendetails',
  details: '/neolapi-b2c-consumptions-rest/consumptions/details',
  periods: '/neolapi-b2c-billings-rest/billing/periodlist',
};

const COOKIE_TTL_MS = 4 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30000;
const AUTH_ERROR_HINTS = /sesi[oó]n|session|token|autentic|authori|login|caducad|expir/i;

class EndesaAuthError extends Error {}

let userAgent = BASE_UA;

const log = (cfg, msg) => console.log(`[Endesa/${cfg.key}] ${msg}`);

const toEndesaDate = (iso) => iso.split('-').reverse().join('/');

function fromEndesaDate(value) {
  const match = String(value).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

// Un solo login simultáneo por contrato
const loginsInFlight = new Map();

function login(cfg) {
  if (!loginsInFlight.has(cfg.key)) {
    loginsInFlight.set(
      cfg.key,
      loginWithBrowser(cfg).finally(() => loginsInFlight.delete(cfg.key)),
    );
  }
  return loginsInFlight.get(cfg.key);
}

async function loginWithBrowser(cfg) {
  if (!cfg.user || !cfg.password) {
    throw new EndesaAuthError(`Faltan usuario y contraseña de Endesa para ${cfg.key}`);
  }

  const browser = await launchBrowser();

  try {
    // UA del Chromium real sin la marca "HeadlessChrome", que algunos WAF bloquean
    userAgent = BASE_UA.replace(
      /Chrome\/[\d.]+/,
      `Chrome/${browser.version().split('.')[0]}.0.0.0`,
    );
    const context = await browser.newContext({
      userAgent,
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
    });
    const page = await context.newPage();

    let sessionId = null;
    page.on('request', (request) => {
      sessionId = request.headers()['sessionid'] ?? sessionId;
    });

    log(cfg, 'Iniciando sesión...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await acceptCookies(page);

    const userInput = page
      .locator('#username, input[name="username"], input[type="email"]')
      .first();
    await userInput.waitFor({ timeout: 30000 });
    await userInput.fill(cfg.user);
    await page.locator('#password, input[type="password"]').first().fill(cfg.password);
    await page.locator('#loginButton, button[type="submit"]:has-text("Acceder")').first().click();

    await waitForLoginToLeave(page, {
      isLoginUrl: (url) => url.pathname.includes('login'),
      timeout: 45000,
      ErrorClass: EndesaAuthError,
    });

    // La oficina online lanza peticiones con la cabecera `sessionid`
    const sessionRequest = page
      .waitForRequest((r) => Boolean(r.headers()['sessionid']), { timeout: 20000 })
      .catch(() => null);
    await page
      .goto(POST_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      .catch(() => {});
    await sessionRequest;

    const cookies = await context.cookies(['https://www.endesa.com', API_BASE]);
    const session = {
      cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      sessionId,
      userAgent,
      timestamp: Date.now(),
    };
    writeJson(cfg.cookieCacheFile, session);
    log(cfg, `Sesión iniciada (${cookies.length} cookies${sessionId ? ' + sessionId' : ''})`);
    return session;
  } catch (error) {
    if (error instanceof EndesaAuthError) throw error;
    throw new Error(`[Endesa/${cfg.key}] Error en el login: ${error.message}`, { cause: error });
  } finally {
    await browser.close();
  }
}

// Cookies del .env > cache vigente > login nuevo
async function getSession(cfg) {
  if (cfg.cookie)
    return { cookieHeader: cfg.cookie, sessionId: cfg.sessionId ?? null, source: 'env' };

  const cached = readJson(cfg.cookieCacheFile, null);
  if (cached?.cookieHeader && Date.now() - cached.timestamp < COOKIE_TTL_MS) {
    if (cached.userAgent) userAgent = cached.userAgent;
    return { ...cached, source: 'cache' };
  }

  return { ...(await login(cfg)), source: 'login' };
}

async function apiPost(cfg, apiPath, body, session) {
  let response;
  try {
    response = await fetch(API_BASE + apiPath, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify(body),
      headers: {
        Cookie: session.cookieHeader,
        'Content-Type': 'application/json; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'User-Agent': userAgent,
        Origin: API_BASE,
        Referer: POST_LOGIN_URL,
        'X-Requested-With': 'XMLHttpRequest',
        lang: '1383137899042',
        language: 'es',
        ...(session.sessionId && { sessionid: session.sessionId }),
      },
    });
  } catch (err) {
    throw new Error(`[Endesa/${cfg.key}] Error de red: ${err.message}`, { cause: err });
  }

  if ([301, 302, 303, 307, 401, 403].includes(response.status)) {
    throw new EndesaAuthError(`Sesión no válida (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(`[Endesa/${cfg.key}] HTTP ${response.status}`);

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Con la sesión caducada Endesa responde con una página HTML
    if (/<html/i.test(text)) throw new EndesaAuthError('Sesión no válida (respuesta HTML)');
    throw new Error(`[Endesa/${cfg.key}] Respuesta no JSON`);
  }

  if (data.errorCode && data.errorCode !== 'ERR-000') {
    const message = data.errorDescription || data.errorCode;
    if (AUTH_ERROR_HINTS.test(message)) throw new EndesaAuthError(message);
    throw new Error(`[Endesa/${cfg.key}] ${message}`);
  }
  return data;
}

// Si la sesión es rechazada se invalida, se hace login de nuevo y se reintenta una vez
async function withSession(cfg, apiFn) {
  const session = await getSession(cfg);
  try {
    return await apiFn(session);
  } catch (err) {
    const retriable = err instanceof EndesaAuthError || session.source === 'env';
    if (!retriable || !cfg.user || !cfg.password) throw err;

    log(cfg, `Sesión (${session.source}) rechazada: ${err.message}. Reintentando...`);
    writeJson(cfg.cookieCacheFile, { timestamp: 0 });
    return apiFn(await login(cfg));
  }
}

function contractBody(cfg) {
  if (!cfg.clientId || !cfg.contractId) {
    throw new Error(`Faltan clientId y contractId para ${cfg.key}`);
  }
  return { clientId: cfg.clientId, contractId: cfg.contractId, channel: 'EWEB' };
}

/**
 * Convierte la respuesta de la API en registros diarios. `hour` va de 1 a 24
 * (la 1 es 00:00-01:00). Los días aún sin lectura llegan a 0 y se descartan.
 */
export function parseEndesaData(apiResponse) {
  const records = [];

  for (const day of apiResponse?.consumption ?? []) {
    const byHour = new Map();
    for (const fragment of day.barFragments ?? []) {
      for (const h of fragment.fragmentHours ?? []) {
        byHour.set(h.hour, (byHour.get(h.hour) ?? 0) + (h.hourConsum || 0));
      }
    }

    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: i + 1,
      kwh: Math.round((byHour.get(i + 1) ?? 0) * 1000) / 1000,
    }));
    const totalKwh = Math.round((day.dayConsum || 0) * 1000) / 1000;
    if (totalKwh === 0 && !hourly.some((h) => h.kwh > 0)) continue;

    records.push({
      date: fromEndesaDate(day.date),
      totalKwh,
      hourly,
      fragments: (day.barFragments ?? [])
        .filter((f) => f.fragmentConsum > 0)
        .map((f) => ({
          consum: f.fragmentConsum,
          hours: (f.fragmentHours ?? []).map((h) => h.hour),
        })),
      source: 'endesa',
    });
  }

  return records.sort((a, b) => a.date.localeCompare(b.date));
}

// Últimos ~22 días
export async function scrapeEndesa(cfg) {
  const raw = await withSession(cfg, (s) => apiPost(cfg, PATHS.recent, contractBody(cfg), s));
  log(cfg, `${raw.consumption?.length ?? 0} días recientes`);
  return parseEndesaData(raw);
}

export async function scrapeEndesaPeriods(cfg) {
  const data = await withSession(cfg, (s) => apiPost(cfg, PATHS.periods, contractBody(cfg), s));
  const periods = (data.periodList ?? []).map((p) => ({
    from: fromEndesaDate(p.invoicedPeriod.from),
    to: fromEndesaDate(p.invoicedPeriod.to),
    isCurrent: Boolean(p.isCurrentPeriod),
    billSequence: p.billSequence ?? 0,
    codFactAtr: p.codFactAtr,
    contractNumber: p.contractNumber,
    consumption: p.consumption,
    codCompany: p.codCompany,
    billNumber: p.billNumber,
  }));
  log(cfg, `${periods.length} períodos`);
  return { periods, consumptionMean: data.consumptionMean ?? null };
}

export async function scrapeEndesaByPeriod(period, cfg) {
  if (!cfg.clientId) throw new Error(`Falta clientId para ${cfg.key}`);
  const body = {
    billSec: period.billSequence || 0,
    channel: 'EWEB',
    clientId: cfg.clientId,
    codCompany: period.codCompany || '20',
    codigoFiscalFactura: period.codFactAtr || '',
    contract: period.contractNumber || '',
    startDate: toEndesaDate(period.from),
    endDate: toEndesaDate(period.to),
  };
  const raw = await withSession(cfg, (s) => apiPost(cfg, PATHS.details, body, s));
  log(cfg, `Período ${body.startDate} - ${body.endDate}: ${raw.consumption?.length ?? 0} días`);
  return parseEndesaData(raw);
}
