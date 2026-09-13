import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ENV } from './config/env.js';
import { apiRouter } from './routes/apiRoutes.js';

const rootDir = process.cwd();

export async function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Vite development middleware or production static serving
  if (ENV.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: rootDir,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

export async function startServer() {
  const app = await createApp();

  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`[Li Ming Mandarin Tutor] Server running at http://0.0.0.0:${ENV.PORT} (${ENV.NODE_ENV})`);
  });
}

// Auto-start server
startServer();

