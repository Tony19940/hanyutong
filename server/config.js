import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function readInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  rootDir,
  port: readInt(process.env.PORT, 3001),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  botToken: process.env.BOT_TOKEN || '',
  webappUrl: process.env.WEBAPP_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  userSessionTtlHours: readInt(process.env.USER_SESSION_TTL_HOURS, 24 * 7),
  adminSessionTtlHours: readInt(process.env.ADMIN_SESSION_TTL_HOURS, 12),
  loginRateWindowMs: readInt(process.env.LOGIN_RATE_WINDOW_MS, 15 * 60 * 1000),
  loginRateLimit: readInt(process.env.LOGIN_RATE_LIMIT, 10),
  adminRateWindowMs: readInt(process.env.ADMIN_RATE_WINDOW_MS, 15 * 60 * 1000),
  adminRateLimit: readInt(process.env.ADMIN_RATE_LIMIT, 5),
  defaultWordBatch: readInt(process.env.DEFAULT_WORD_BATCH, 20),
  maxWordBatch: readInt(process.env.MAX_WORD_BATCH, 100),
  maxKeyGenerationCount: readInt(process.env.MAX_KEY_GENERATION_COUNT, 100),
  maxKeyCollisionRetries: readInt(process.env.MAX_KEY_COLLISION_RETRIES, 10),
  hskThresholds: [
    { minLearned: 2500, level: 6 },
    { minLearned: 1200, level: 5 },
    { minLearned: 600, level: 4 },
    { minLearned: 300, level: 3 },
    { minLearned: 150, level: 2 },
  ],
};

export function validateConfig() {
  if (!config.adminPassword) {
    throw new Error('ADMIN_PASSWORD is required');
  }

  if (config.nodeEnv === 'production') {
    if (!config.botToken) {
      throw new Error('BOT_TOKEN is required in production');
    }
    if (!config.webappUrl) {
      throw new Error('WEBAPP_URL is required in production');
    }
  }
}
