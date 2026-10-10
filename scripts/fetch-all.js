/**
 * npm run fetch:all                  consumo de todos los contratos + facturas
 * npm run fetch:all -- --backfill    incluye todo el histórico de consumo
 */

import '../server/env.js';
import { syncAll } from '../server/services/sync.js';

const results = await syncAll({ backfill: process.argv.includes('--backfill') });
const entries = Object.entries(results);

if (entries.length === 0) console.warn('No hay ningún origen con credenciales en .env');

for (const [key, r] of entries) {
  if (r.error) console.error(`[ERROR] ${key}: ${r.error}`);
  else console.log(`[OK] ${key}: +${r.added} nuevos, ${r.updated} actualizados`);
}

process.exit(entries.some(([, r]) => r.error) ? 1 : 0);
