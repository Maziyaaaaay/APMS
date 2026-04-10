import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import certificatesRoutes from './routes/certificates.js';
import departmentsRoutes from './routes/departments.js';
import circularsRoutes from './routes/circulars.js';
import overridesRoutes from './routes/overrides.js';

const app = express();

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173',
     'http://127.0.0.1:5173', 'http://127.0.0.1:4173'];

app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/circulars', circularsRoutes);
app.use('/api/overrides', overridesRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ APMS backend running on http://localhost:${PORT}`);
  console.log(`   Connected to Supabase: ${process.env.SUPABASE_URL}`);
});
