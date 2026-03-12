/**
 * Script para obtener datos de consumo de Endesa (ambos contratos).
 *
 * Uso:
 *   npm run fetch:endesa                          -> últimos ~22 días (ambos contratos)
 *   npm run fetch:endesa -- --contract comunes    -> solo un contrato
 */

import dotenv from 'dotenv';
import { scrapeEndesa } from '../server/scrapers/endesa-scraper.js';
import { appendData } from '../server/utils/dataStore.js';
import CONTRACTS from '../server/config/endesa-contracts.js';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--contract' && args[i + 1]) params.contract = args[++i];
  }
  return params;
}

async function fetchContract(contractConfig) {
  console.log(`\n--- ${contractConfig.label} (${contractConfig.key}) ---`);

  if (!contractConfig.clientId || !contractConfig.contractId) {
    console.warn(`Saltando ${contractConfig.key}: faltan clientId o contractId en .env`);
    return;
  }

  try {
    const data = await scrapeEndesa(contractConfig);
    console.log(`Obtenidos ${data.length} días de consumo`);

    if (data.length > 0) {
      console.log(`Rango: ${data[0].date} - ${data[data.length - 1].date}`);
    }

    const result = appendData(contractConfig.dataFile, data, 'date');
    console.log(`Nuevos: ${result.added}, Total almacenado: ${result.total}`);
  } catch (error) {
    console.error(`Error en ${contractConfig.key}:`, error.message);
  }
}

async function main() {
  console.log('=== Obteniendo datos de Endesa ===');
  console.log(`Hora: ${new Date().toISOString()}`);

  const { contract } = parseArgs();

  if (contract) {
    const config = CONTRACTS[contract];
    if (!config) {
      console.error(`Contrato no válido: ${contract}. Disponibles: ${Object.keys(CONTRACTS).join(', ')}`);
      process.exit(1);
    }
    await fetchContract(config);
  } else {
    for (const config of Object.values(CONTRACTS)) {
      await fetchContract(config);
    }
  }

  console.log('\nFinalizado.');
}

main();
