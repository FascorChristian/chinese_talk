import { Router } from 'express';
import { handleChat, handleHints } from '../controllers/chatController.js';
import { handleGenerateReading } from '../controllers/readingController.js';
import { handleGenerateShadowing } from '../controllers/shadowingController.js';
import { handleGenerateScenario } from '../controllers/scenarioController.js';

export const apiRouter = Router();

apiRouter.post('/chat', handleChat);
apiRouter.post('/hints', handleHints);
apiRouter.post('/generate-reading', handleGenerateReading);
apiRouter.post('/generate-shadowing', handleGenerateShadowing);
apiRouter.post('/generate-scenario', handleGenerateScenario);

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 handler for undefined API routes
apiRouter.use('*', (_req, res) => {
  res.status(404).json({ error: 'Ruta API no encontrada' });
});

