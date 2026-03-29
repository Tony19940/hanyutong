import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import wordsRoutes from './routes/words.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import dialogueRoutes from './routes/dialogue.js';
import { setupBot } from './bot.js';
import { config, validateConfig } from './config.js';
import { initDb } from './db.js';
import { errorHandler } from './errors.js';
import { getVocabulary } from './services/vocabularyService.js';
import { attachDialogueProxyServer } from './services/dialogueProxyServer.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  validateConfig();
  getVocabulary();
  await initDb();

  const app = express();
  const distPath = path.join(__dirname, '..', 'dist');

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      environment: config.nodeEnv,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/words', wordsRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dialogue', dialogueRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'API route not found',
      code: 'API_ROUTE_NOT_FOUND',
    });
  });

  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        error: 'API route not found',
        code: 'API_ROUTE_NOT_FOUND',
      });
    }

    return res.sendFile(path.join(distPath, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}

export async function startServer() {
  const app = await createApp();
  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    setupBot(config.botToken, config.webappUrl);
  });
  attachDialogueProxyServer(server);
  return server;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
