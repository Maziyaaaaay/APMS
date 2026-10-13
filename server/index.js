import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
dotenv.config();

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import certificatesRoutes from './routes/certificates.js';
import departmentsRoutes from './routes/departments.js';
import circularsRoutes from './routes/circulars.js';
import overridesRoutes from './routes/overrides.js';

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173',
     'http://127.0.0.1:5173', 'http://127.0.0.1:4173'];

app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '14mb' }));
app.use(express.urlencoded({ limit: '14mb', extended: true }));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/circulars', circularsRoutes);
app.use('/api/overrides', overridesRoutes);

// One hosted service serves the app and API on the same origin.
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
const clientDist = fileURLToPath(new URL('../client/dist/', import.meta.url));
if (existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Global error handler
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Upload is too large. Choose a file up to 10 MB.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body.' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
