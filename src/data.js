import luzComunes from '../data/luz-comunes.json';
import luzPortales from '../data/luz-portales.json';
import agua from '../data/agua.json';
import { enrichInvoices, groupInvoices } from './utils/analytics.js';
import { fmtNum, fmtNum0 } from './utils/format.js';

const newestFirst = (list) => [...list].sort((a, b) => b.fEmision.localeCompare(a.fEmision));
const waterMeters = new Set(agua.map((i) => i.contador)).size;

export const SUPPLIES = {
  comunes: {
    key: 'comunes',
    kind: 'invoices',
    title: 'Zonas comunes',
    kicker: 'Luz · Zonas comunes',
    tab: 'Zonas comunes',
    shortTab: 'Comunes',
    unit: 'kWh',
    formatQty: fmtNum0,
    invoices: enrichInvoices(newestFirst(luzComunes)),
  },
  portales: {
    key: 'portales',
    kind: 'hourly',
    title: 'Portales 1–7',
    kicker: 'Luz · Portales',
    tab: 'Portales',
    shortTab: 'Portales',
    unit: 'kWh',
    formatQty: fmtNum0,
    days: [...luzPortales].sort((a, b) => a.date.localeCompare(b.date)),
  },
  agua: {
    key: 'agua',
    kind: 'invoices',
    title: 'Agua',
    kicker: `Agua · ${waterMeters} contadores`,
    tab: 'Agua',
    shortTab: 'Agua',
    unit: 'm³',
    formatQty: fmtNum,
    inclusiveDays: true,
    grouped: true,
    meters: waterMeters,
    uses: ['Riego y piscina', 'Zonas comunes', 'Contra incendios'],
    invoices: enrichInvoices(newestFirst(groupInvoices(agua, (i) => i.periodo)), {
      flagOutliers: false,
    }),
  },
};
