/**
 * Scraper para el portal "Mi Empresa" de Endesa (Salesforce Aura).
 * Obtiene el historial de facturas de electricidad.
 */

import fetch from 'node-fetch';
import { BILLING_CONFIG } from '../config/endesa-contracts.js';

const AURA_URL = 'https://endesa-atenea.my.site.com/miempresa/s/sfsites/aura';

/**
 * Llama al endpoint Aura para obtener el historial de facturas.
 */
export async function fetchBillingHistory(config = BILLING_CONFIG) {
  if (!config.cookie || !config.auraToken) {
    throw new Error('Billing: cookie y auraToken son requeridos en .env');
  }

  const message = JSON.stringify({
    actions: [{
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
    }],
  });

  const auraContext = JSON.stringify({
    mode: 'PROD',
    fwuid: config.auraFwuid,
    app: 'siteforce:communityApp',
    loaded: {
      'APPLICATION@markup://siteforce:communityApp': '1529_lI95rFcxq-le9BLgryC1ew',
    },
    dn: [],
    globals: {},
    uad: true,
  });

  const body = new URLSearchParams({
    message,
    'aura.context': auraContext,
    'aura.pageURI': '/miempresa/s/',
    'aura.token': config.auraToken,
  });

  console.log('[Endesa/Billing] Pidiendo historial de facturas...');

  const response = await fetch(
    `${AURA_URL}?r=6&other.PA_ListaFacturas.getHistoricoFacturas_Monopunto=1`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: config.cookie,
        Origin: 'https://endesa-atenea.my.site.com',
        Referer: 'https://endesa-atenea.my.site.com/miempresa/s/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    throw new Error(`[Endesa/Billing] HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.actions || !data.actions[0] || data.actions[0].state !== 'SUCCESS') {
    const errMsg = data.actions?.[0]?.error?.[0]?.message || 'Respuesta no exitosa';
    throw new Error(`[Endesa/Billing] ${errMsg}`);
  }

  const rawInvoices = JSON.parse(data.actions[0].returnValue);
  console.log(`[Endesa/Billing] ${rawInvoices.length} facturas obtenidas`);

  return rawInvoices.map((inv) => ({
    numFact: inv.numFact,
    importe: inv.importe,
    consumo: inv.consumo,
    fEmision: inv.fEmision,
    cups: inv.CUPS,
    digital: inv.digital,
    codigoDescarga: inv.codigoFactDescarga,
  })).sort((a, b) => b.fEmision.localeCompare(a.fEmision));
}
