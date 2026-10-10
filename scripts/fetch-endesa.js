/**
 * npm run fetch:endesa                          últimos días + períodos recientes
 * npm run fetch:endesa -- --contract portales   un solo contrato
 * npm run fetch:endesa -- --backfill            todo el histórico disponible
 */

import '../server/env.js';
import CONTRACTS from '../server/config/endesa-contracts.js';
import { syncContract, hasConsumptionCredentials } from '../server/services/sync.js';

const args = process.argv.slice(2);
const backfill = args.includes('--backfill');
const contractArg = args[args.indexOf('--contract') + 1];
const onlyOne = args.includes('--contract');

if (onlyOne && !Object.hasOwn(CONTRACTS, contractArg)) {
  console.error(
    `Contrato no válido: ${contractArg}. Disponibles: ${Object.keys(CONTRACTS).join(', ')}`,
  );
  process.exit(1);
}

const configs = onlyOne ? [CONTRACTS[contractArg]] : Object.values(CONTRACTS);
let failed = false;

for (const cfg of configs) {
  console.log(`\n${cfg.label} (${cfg.key})`);
  if (!hasConsumptionCredentials(cfg)) {
    console.warn('  Sin clientId/contractId o credenciales en .env, se omite');
    continue;
  }
  try {
    const r = await syncContract(cfg, { backfill });
    console.log(
      `  +${r.added} nuevos · ${r.updated} actualizados · ${r.periodsFetched} períodos descargados`,
    );
  } catch (err) {
    failed = true;
    console.error(`  Error: ${err.message}`);
  }
}

process.exit(failed ? 1 : 0);
