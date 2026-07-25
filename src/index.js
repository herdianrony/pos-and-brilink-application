/**
 * CatatAgen Express Server — main entry point.
 *
 * Serves:
 *   - API routes   → /api/*
 *   - React SPA   → static files from src-tauri-ui/dist (in production)
 *   - WhatsApp    → integrated Baileys (no separate sidecar)
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { getDb } from './config/database.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import accountsRoutes from './routes/accounts.js';
import transactionsRoutes from './routes/transactions.js';
import agentRoutes from './routes/agent.js';
import debtsRoutes from './routes/debts.js';
import settingsRoutes from './routes/settings.js';
import backupRoutes from './routes/backup.js';
import whatsappRoutes from './routes/whatsapp.js';
import seedRoutes from './routes/seed.js';
import dashboardRoutes from './routes/dashboard.js';
import printerRoutes from './routes/printer.js';
import healthRoutes from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);
const require = createRequire(import.meta.url);

const app = express();

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── API Routes ──────────────────────────────────────────────────────
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', productsRoutes);
app.use('/api', accountsRoutes);
app.use('/api', transactionsRoutes);
app.use('/api', agentRoutes);
app.use('/api', debtsRoutes);
app.use('/api', settingsRoutes);
app.use('/api', backupRoutes);
app.use('/api', whatsappRoutes);
app.use('/api', seedRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', printerRoutes);

// ── Serve React SPA (production build) ────────────────────────────
const distPath = path.join(__dirname, '..', 'src-tauri-ui', 'dist');

// Serve static files using sendFile (avoid express.static which has require() issues in ESM)
app.use('/assets', (req, res) => {
  const filePath = path.join(distPath, req.path);
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// SPA fallback: serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// ── Initialize DB & Start ──────────────────────────────────────────
try {
  getDb(); // triggers migration & seed
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[CatatAgen] Express server running on http://127.0.0.1:${PORT}`);
  });
} catch (err) {
  console.error('[CatatAgen] Failed to start:', err.message);
  process.exit(1);
}
