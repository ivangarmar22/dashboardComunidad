import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

// Asegurar que el directorio de datos existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Lee datos de un archivo JSON. Devuelve array vacio si no existe.
 */
export function readData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Escribe datos a un archivo JSON.
 */
export function writeData(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Agrega nuevos registros sin duplicar por fecha.
 * Cada registro debe tener un campo `date` (YYYY-MM-DD) o `timestamp`.
 */
export function appendData(filename, newRecords, keyField = 'date') {
  const existing = readData(filename);
  const existingKeys = new Set(existing.map((r) => r[keyField]));

  const toAdd = newRecords.filter((r) => !existingKeys.has(r[keyField]));
  const merged = [...existing, ...toAdd];

  // Ordenar por fecha/timestamp
  merged.sort((a, b) => {
    const da = new Date(a[keyField]);
    const db = new Date(b[keyField]);
    return da - db;
  });

  writeData(filename, merged);
  return { added: toAdd.length, total: merged.length };
}

/**
 * Obtiene datos filtrados por rango de fechas.
 */
export function getDataByRange(filename, startDate, endDate, keyField = 'date') {
  const data = readData(filename);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return data.filter((r) => {
    const d = new Date(r[keyField]);
    return d >= start && d <= end;
  });
}
