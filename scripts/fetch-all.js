/**
 * Script maestro que ejecuta todos los fetchers.
 * Ejecutar: npm run fetch:all
 */

import { execSync } from 'child_process';

const scripts = [
  { name: 'Endesa', cmd: 'node scripts/fetch-endesa.js' },
];

console.log('==========================================');
console.log(' Obteniendo todos los datos de consumo');
console.log(`  ${new Date().toISOString()}`);
console.log('==========================================\n');

for (const script of scripts) {
  console.log(`--- ${script.name} ---`);
  try {
    execSync(script.cmd, { stdio: 'inherit' });
    console.log(`[OK] ${script.name} completado\n`);
  } catch (error) {
    console.error(`[ERROR] ${script.name} fallo: ${error.message}\n`);
  }
}

console.log('==========================================');
console.log(' Proceso completado');
console.log('==========================================');
