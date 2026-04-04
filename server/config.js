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
  runtimeDir: path.join(rootDir, 'data', 'runtime'),
  port: readInt(process.env.PORT, 3001),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  botToken: process.env.BOT_TOKEN || '',
  webappUrl: process.env.WEBAPP_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  userSessionTtlHours: readInt(process.env.USER_SESSION_TTL_HOURS, 24 * 7),
  adminSessionTtlHours: readInt(process.env.ADMIN_SESSION_TTL_HOURS, 12),
  trialDays: readInt(process.env.TRIAL_DAYS, 3),
  invitedTrialDays: readInt(process.env.INVITED_TRIAL_DAYS, 3),
  premiumDurationDays: readInt(process.env.PREMIUM_DURATION_DAYS, 30),
  referralRewardDays: readInt(process.env.REFERRAL_REWARD_DAYS, 7),
  loginRateWindowMs: readInt(process.env.LOGIN_RATE_WINDOW_MS, 15 * 60 * 1000),
  loginRateLimit: readInt(process.env.LOGIN_RATE_LIMIT, 10),
  adminRateWindowMs: readInt(process.env.ADMIN_RATE_WINDOW_MS, 15 * 60 * 1000),
  adminRateLimit: readInt(process.env.ADMIN_RATE_LIMIT, 5),
  defaultWordBatch: readInt(process.env.DEFAULT_WORD_BATCH, 20),
  maxWordBatch: readInt(process.env.MAX_WORD_BATCH, 100),
  maxKeyGenerationCount: readInt(process.env.MAX_KEY_GENERATION_COUNT, 100),
  maxKeyCollisionRetries: readInt(process.env.MAX_KEY_COLLISION_RETRIES, 10),
  doubaoAsrAppId: process.env.DOUBAO_ASR_APP_ID || '',
  doubaoAsrAccessToken: process.env.DOUBAO_ASR_ACCESS_TOKEN || '',
  doubaoAsrResourceId: process.env.DOUBAO_ASR_RESOURCE_ID || 'volc.bigasr.auc_turbo',
  arkApiKey: process.env.ARK_API_KEY || '',
  arkBaseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  arkDoubaoFlashEndpointId: process.env.ARK_DOUBAO_FLASH_ENDPOINT_ID || '',
  doubaoTtsAppId: process.env.DOUBAO_TTS_APP_ID || '',
  doubaoTtsToken: process.env.DOUBAO_TTS_TOKEN || '',
  doubaoTtsCluster: process.env.DOUBAO_TTS_CLUSTER || 'volcano_tts',
  doubaoTtsVoiceType: process.env.DOUBAO_TTS_VOICE_TYPE || 'BV705_streaming',
  doubaoTtsEncoding: process.env.DOUBAO_TTS_ENCODING || 'mp3',
  doubaoTtsRate: readInt(process.env.DOUBAO_TTS_RATE, 24000),
  doubaoTtsSpeedRatio: Number.parseFloat(process.env.DOUBAO_TTS_SPEED_RATIO || '1.0') || 1.0,
  doubaoTtsVolumeRatio: Number.parseFloat(process.env.DOUBAO_TTS_VOLUME_RATIO || '1.0') || 1.0,
  doubaoTtsPitchRatio: Number.parseFloat(process.env.DOUBAO_TTS_PITCH_RATIO || '1.0') || 1.0,
  doubaoTtsEmotion: process.env.DOUBAO_TTS_EMOTION || '',
  doubaoTtsLanguage: process.env.DOUBAO_TTS_LANGUAGE || 'cn',
  doubaoTtsAllowedVoices: String(process.env.DOUBAO_TTS_ALLOWED_VOICES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiKhmerModel: process.env.GEMINI_KHMER_MODEL || 'gemini-3.1-flash-live-preview',
  xfyunAppId: process.env.XFYUN_APP_ID || '',
  xfyunApiKey: process.env.XFYUN_API_KEY || '',
  xfyunApiSecret: process.env.XFYUN_API_SECRET || '',
  xfyunIseWsUrl: process.env.XFYUN_ISE_WS_URL || 'wss://ise-api.xfyun.cn/v2/open-ise',
  dialogueAudioCacheDir: process.env.DIALOGUE_AUDIO_CACHE_DIR || path.join(rootDir, 'data', 'runtime', 'dialogue-audio'),
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

  if (!config.databaseUrl && config.nodeEnv !== 'test') {
    throw new Error('DATABASE_URL is required');
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
