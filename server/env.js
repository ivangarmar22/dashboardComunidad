// Carga .env si existe (en producción las variables llegan del entorno)
try {
  process.loadEnvFile();
} catch {
  // Sin .env
}
