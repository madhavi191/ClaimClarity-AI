import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.js';
import { db, StorageConfigurationError } from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // Support reverse proxy for Cloud Run
  app.set('trust proxy', 1);

  // Security Headers via Helmet
  pp.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups',
      },
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  // Defensive JSON & body parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Safe, idempotent storage initialization during startup
  try {
    const initResult = await db.initialize();
    console.log(`[ClaimClarity AI] Storage initialization: [${initResult.status}] ${initResult.message}`);
  } catch (err: any) {
    if (err instanceof StorageConfigurationError) {
      console.warn(`[ClaimClarity AI] Storage configuration notice (${err.code}): ${err.message}`);
    } else {
      console.warn('[ClaimClarity AI] Storage initialization notice:', err?.message || err);
    }
  }

  // In development, mount Vite in middleware mode bound to the HTTP server
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ClaimClarity AI] Server listening on port ${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[ClaimClarity AI] Fatal server startup error:', err);
  process.exit(1);
});
