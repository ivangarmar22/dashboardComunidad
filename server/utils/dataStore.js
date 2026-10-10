import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Cache en memoria invalidada por fecha de modificación
const cache = new Map();

export function readJson(filename, fallback = null) {
  const filePath = path.join(DATA_DIR, filename);
  let mtimeMs;
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    return fallback;
  }

  const cached = cache.get(filePath);
  if (cached?.mtimeMs === mtimeMs) return cached.value;

  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    cache.set(filePath, { mtimeMs, value });
    return value;
  } catch (err) {
    console.error(`[dataStore] No se pudo leer ${filename}: ${err.message}`);
    return fallback;
  }
}

// Escritura atómica: un corte a mitad no deja el archivo corrupto
export function writeJson(filename, value) {
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
  cache.delete(filePath);
}

export function readData(filename) {
  const data = readJson(filename, []);
  return Array.isArray(data) ? data : [];
}

/**
 * Inserta registros nuevos y sustituye los existentes que hayan cambiado
 * (p. ej. un día que Endesa aún no había leído).
 */
export function upsertData(
  filename,
  newRecords,
  keyField = 'date',
  compare = (a, b) => String(a[keyField]).localeCompare(String(b[keyField])),
) {
  const byKey = new Map(readData(filename).map((r) => [r[keyField], r]));
  let added = 0;
  let updated = 0;

  for (const record of newRecords) {
    const key = record[keyField];
    if (key == null) continue;
    const prev = byKey.get(key);
    if (!prev) added++;
    else if (JSON.stringify(prev) !== JSON.stringify(record)) updated++;
    else continue;
    byKey.set(key, record);
  }

  const merged = [...byKey.values()].sort(compare);
  if (added > 0 || updated > 0) writeJson(filename, merged);
  return { added, updated, total: merged.length };
}

// Fechas YYYY-MM-DD comparadas como texto: sin desfases de zona horaria
export function getDataByRange(filename, startDate, endDate, keyField = 'date') {
  return readData(filename).filter((r) => {
    const d = String(r[keyField]).slice(0, 10);
    return d >= startDate && d <= endDate;
  });
}
