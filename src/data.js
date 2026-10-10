import luzComunes from '../data/luz-comunes.json';
import luzPortales from '../data/luz-portales.json';
import agua from '../data/agua.json';
import { enrichInvoices } from './utils/analytics.js';
import { fmtNum, fmtNum0 } from './utils/format.js';

const newestFirst = (list) => [...list].sort((a, b) => b.fEmision.localeCompare(a.fEmision));

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
    kicker: 'Agua · Comunidad',
    tab: 'Agua',
    shortTab: 'Agua',
    unit: 'm³',
    formatQty: fmtNum,
    invoices: enrichInvoices(newestFirst(agua)),
  },
};
