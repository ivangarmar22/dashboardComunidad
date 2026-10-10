/**
 * Historial de facturas del portal "Mi Empresa" de Endesa (Salesforce Aura).
 * Sesión: tokens del .env > sesión cacheada > login con Playwright, que captura
 * `aura.token` y `aura.context` de las propias peticiones de la página.
 */

import { BILLING_CONFIG } from '../config/endesa-contracts.js';
import { readJson, writeJson } from '../utils/dataStore.js';
import { BASE_UA, acceptCookies, launchBrowser, waitForLoginToLeave } from './browser.js';

const SITE_ORIGIN = 'https://endesa-atenea.my.site.com';
const SITE_BASE = `${SITE_ORIGIN}/miempresa/s/`;
const AURA_URL = `${SITE_BASE}sfsites/aura`;
const SESSION_CACHE_FILE = '.endesa-billing-session.json';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
// Solo se usa si no se ha podido capturar la versión real de la app
const DEFAULT_APP_LOADED = {
  'APPLICATION@markup://siteforce:communityApp': '1529_lI95rFcxq-le9BLgryC1ew',
};

class BillingAuthError extends Error {}

function envSession(config) {
  if (!config.cookie || !config.auraToken) return null;
  return {
    cookie: config.cookie,
    auraToken: config.auraToken,
    fwuid: config.auraFwuid,
    loaded: DEFAULT_APP_LOADED,
    source: 'env',
  };
}

function cachedSession() {
  const cached = readJson(SESSION_CACHE_FILE, null);
  if (cached?.auraToken && Date.now() - cached.timestamp < SESSION_TTL_MS) {
    return { ...cached, source: 'cache' };
  }
  return null;
}

let loginInFlight = null;

function login(config) {
  loginInFlight ??= loginWithBrowser(config).finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function loginWithBrowser(config) {
  if (!config.user || !config.password) {
    throw new BillingAuthError('Faltan ENDESA_BILLING_USER y ENDESA_BILLING_PASSWORD');
  }

  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({
      userAgent: BASE_UA,
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
    });
    const page = await context.newPage();

    console.log('[Endesa/Billing] Iniciando sesión en Mi Empresa...');
    await page.goto(`${SITE_BASE}login/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await acceptCookies(page);

    const userInput = page
      .locator('input[name="Username"], input[name="username"], input[placeholder*="suario" i]')
      .first();
    await userInput.waitFor({ timeout: 30000 });
    await userInput.fill(config.user);
    await page.locator('input[type="password"]').first().fill(config.password);
    await page.locator('button:has-text("Acceder"), button[type="submit"]').first().click();

    await waitForLoginToLeave(page, {
      isLoginUrl: (url) => url.pathname.includes('/login'),
      timeout: 45000,
      ErrorClass: BillingAuthError,
    });
    if (/verification|identity|verificar/i.test(page.url())) {
      throw new BillingAuthError(
        'Mi Empresa pide verificar la identidad con un código; usa ENDESA_BILLING_COOKIE y ENDESA_BILLING_AURA_TOKEN',
      );
    }

    // Cualquier llamada Aura de la portada lleva el token y el contexto
    const auraRequest = page
      .waitForRequest(
        (r) =>
          r.url().includes('/sfsites/aura') &&
          r.method() === 'POST' &&
          /aura\.token=/.test(r.postData() ?? ''),
        { timeout: 45000 },
      )
      .catch(() => null);
    if (!page.url().startsWith(SITE_BASE)) {
      await page.goto(SITE_BASE, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    }
    const request = await auraRequest;
    if (!request) throw new Error('No se capturó ninguna petición Aura tras el login');

    const params = new URLSearchParams(request.postData());
    const auraContext = JSON.parse(params.get('aura.context') || '{}');
    const cookies = await context.cookies([SITE_ORIGIN]);

    const session = {
      cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      auraToken: params.get('aura.token'),
      fwuid: auraContext.fwuid,
      loaded: auraContext.loaded ?? DEFAULT_APP_LOADED,
      timestamp: Date.now(),
    };
    writeJson(SESSION_CACHE_FILE, session);
    console.log('[Endesa/Billing] Sesión iniciada');
    return { ...session, source: 'login' };
  } catch (error) {
    if (error instanceof BillingAuthError) throw error;
    throw new Error(`[Endesa/Billing] Error en el login: ${error.message}`, { cause: error });
  } finally {
    await browser.close();
  }
}

async function requestInvoices(session, config) {
  const message = JSON.stringify({
    actions: [
      {
        id: '314;a',
        descriptor: 'apex://PA_ListaFacturasController/ACTION$getHistoricoFacturas_Monopunto',
        callingDescriptor: 'markup://c:PA_HistoricoFacturas_Monopunto',
        params: {
          contractId: config.sfContractId,
          lNegocio: 'Electricidad',
          fechaDesde: null,
          fechaHasta: null,
        },
        version: null,
      },
    ],
  });

  const auraContext = JSON.stringify({
    mode: 'PROD',
    fwuid: session.fwuid,
    app: 'siteforce:communityApp',
    loaded: session.loaded ?? DEFAULT_APP_LOADED,
    dn: [],
    globals: {},
    uad: true,
  });

  const body = new URLSearchParams({
    message,
    'aura.context': auraContext,
    'aura.pageURI': '/miempresa/s/',
    'aura.token': session.auraToken,
  });

  const response = await fetch(
    `${AURA_URL}?r=6&other.PA_ListaFacturas.getHistoricoFacturas_Monopunto=1`,
    {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
      body: body.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: session.cookie,
        Origin: SITE_ORIGIN,
        Referer: SITE_BASE,
        'User-Agent': BASE_UA,
      },
    },
  );

  if ([301, 302, 401, 403].includes(response.status)) {
    throw new BillingAuthError(`Sesión no válida (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(`[Endesa/Billing] HTTP ${response.status}`);

  // Aura antepone "while(1);" a algunas respuestas
  const text = (await response.text()).replace(/^\s*while\(1\);\s*/, '');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BillingAuthError('Respuesta no JSON (sesión caducada)');
  }

  const descriptor = data.event?.descriptor ?? '';
  const exception = data.exceptionEvent ? JSON.stringify(data) : '';
  if (/invalidSession|clientOutOfSync/i.test(descriptor + exception)) {
    throw new BillingAuthError(`Sesión Aura no válida (${descriptor || 'exception'})`);
  }

  const action = data.actions?.[0];
  if (action?.state !== 'SUCCESS') {
    throw new Error(`[Endesa/Billing] ${action?.error?.[0]?.message ?? 'Respuesta no exitosa'}`);
  }

  const raw =
    typeof action.returnValue === 'string' ? JSON.parse(action.returnValue) : action.returnValue;
  console.log(`[Endesa/Billing] ${raw.length} facturas (sesión: ${session.source})`);

  return raw
    .map((inv) => ({
      numFact: inv.numFact,
      importe: Number(inv.importe),
      consumo: Number(inv.consumo),
      fEmision: inv.fEmision,
      cups: inv.CUPS,
      digital: inv.digital,
      codigoDescarga: inv.codigoFactDescarga,
    }))
    .filter((inv) => inv.numFact && inv.fEmision);
}

export async function fetchBillingHistory(config = BILLING_CONFIG) {
  if (!config.sfContractId) throw new Error('Falta ENDESA_BILLING_SF_CONTRACT_ID');

  let lastError = null;
  for (const session of [envSession(config), cachedSession()].filter(Boolean)) {
    try {
      return await requestInvoices(session, config);
    } catch (err) {
      if (!(err instanceof BillingAuthError)) throw err;
      lastError = err;
      console.log(`[Endesa/Billing] Sesión ${session.source} rechazada: ${err.message}`);
    }
  }

  if (!config.user || !config.password) {
    throw lastError ?? new Error('Configura usuario y contraseña o cookie + auraToken en .env');
  }
  return requestInvoices(await login(config), config);
}
