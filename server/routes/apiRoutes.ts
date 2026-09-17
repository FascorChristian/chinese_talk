import { Router } from 'express';
import { handleChat, handleHints } from '../controllers/chatController.js';
import { 
  handleGenerateReading, 
  handleEvaluateReadingAloud, 
  handleEvaluateComprehension 
} from '../controllers/readingController.js';
import { handleGenerateShadowing, handleEvaluateShadowing } from '../controllers/shadowingController.js';
import { handleGenerateScenario } from '../controllers/scenarioController.js';
import { 
  handleGenerateDiagnosticChallenge, 
  handleEvaluateDiagnostic 
} from '../controllers/diagnosticController.js';

export const apiRouter = Router();

apiRouter.post('/chat', handleChat);
apiRouter.post('/hints', handleHints);
apiRouter.post('/generate-reading', handleGenerateReading);
apiRouter.post('/evaluate-reading-aloud', handleEvaluateReadingAloud);
apiRouter.post('/evaluate-comprehension', handleEvaluateComprehension);
apiRouter.post('/generate-shadowing', handleGenerateShadowing);
apiRouter.post('/evaluate-shadowing', handleEvaluateShadowing);
apiRouter.post('/generate-scenario', handleGenerateScenario);
apiRouter.post('/generate-diagnostic-challenge', handleGenerateDiagnosticChallenge);
apiRouter.post('/evaluate-diagnostic', handleEvaluateDiagnostic);

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 handler for undefined API routes
apiRouter.use('*', (_req, res) => {
  res.status(404).json({ error: 'Ruta API no encontrada' });
});

