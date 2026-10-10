/**
 * Copia los datos a dist/data para publicar la web como sitio estático
 * (GitHub Pages). Se ejecuta después de `vite build --mode static`.
 */

import fs from 'node:fs';
import path from 'node:path';
import '../server/env.js';
import CONTRACTS, { BILLING_CONFIG } from '../server/config/endesa-contracts.js';
import { readData } from '../server/utils/dataStore.js';
import { getStatus, listPeriods } from '../server/services/sync.js';

const outDir = path.resolve('dist', 'data');

function write(relativePath, payload) {
  const file = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ success: true, ...payload }));
  console.log(`  ${path.relative(process.cwd(), file)}`);
}

if (!fs.existsSync(path.resolve('dist', 'index.html'))) {
  console.error('No existe dist/index.html: ejecuta antes vite build --mode static');
  process.exit(1);
}

console.log('Exportando datos estáticos:');
write('status.json', { ...getStatus(), generatedAt: new Date().toISOString() });
write('billing.json', { data: readData(BILLING_CONFIG.dataFile) });

for (const cfg of Object.values(CONTRACTS)) {
  write(`${cfg.key}/periods.json`, await listPeriods(cfg, { offline: true }));
  write(`${cfg.key}/days.json`, { data: readData(cfg.dataFile) });
}
