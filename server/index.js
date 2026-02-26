import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import wordsRoutes from './routes/words.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import { setupBot } from './bot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Start Telegram bot
  setupBot(process.env.BOT_TOKEN, process.env.WEBAPP_URL);
});
