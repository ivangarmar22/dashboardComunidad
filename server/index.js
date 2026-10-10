import './env.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import endesaRoutes from './routes/endesa.js';
import { getStatus, startScheduler } from './services/sync.js';

const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = process.env.PORT || 4000;

const app = express();
app.disable('x-powered-by');

// En producción frontend y API comparten origen
if (process.env.NODE_ENV !== 'production') app.use(cors());
app.use(express.json({ limit: '50kb' }));

app.use(
  '/assets',
  express.static(path.join(distPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: false,
  }),
);
app.use(express.static(distPath));

app.use('/api/endesa', endesaRoutes);
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }),
);
app.get('/api/status', (_req, res) => res.json({ success: true, ...getStatus() }));
app.use('/api', (_req, res) =>
  res.status(404).json({ success: false, error: 'Ruta no encontrada' }),
);

app.get('/{*splat}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.use((err, req, res, _next) => {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(`[API] ${req.method} ${req.originalUrl}: ${err.message}`);
  const message = err.type === 'entity.parse.failed' ? 'JSON no válido' : err.message;
  res.status(status).json({ success: false, error: status === 404 ? 'No encontrado' : message });
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  startScheduler();
});
