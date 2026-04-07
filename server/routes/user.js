import multer from 'multer';
import { Router } from 'express';
import { config } from '../config.js';
import { query } from '../db.js';
import { badRequest } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  ensureUserSettingsForDialogue,
  normalizeLanguage,
  normalizeTheme,
} from '../services/userSettingsService.js';
import { bindUserCredentials, getCredentialByUserId } from '../services/credentialService.js';
import { buildUserAvatarSeed, DEFAULT_AVATAR_IDS, isBuiltinAvatarId, resolveFallbackAvatarId } from '../services/avatarService.js';
import { getMembershipAccess } from '../services/membershipService.js';
import { getInviteSummary } from '../services/referralService.js';
import { getVocabularyCount } from '../services/vocabularyService.js';
import { getTeacherVoiceSettings, resolveTeacherVoice } from '../services/voiceInventoryService.js';
import { synthesizeDialogueText } from '../services/doubaoTtsService.js';
import { createNormalizedImageAsset, asMediaUrl } from '../services/mediaService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

router.use(requireUserAuth);

function buildInviteBaseUrl(req) {
  if (config.webappUrl) {
    return config.webappUrl;
  }
  return `${req.protocol}://${req.get('host')}`;
}

async function ensureUserSettings(userId) {
  return ensureUserSettingsForDialogue(userId);
}

function listAvatarOptions() {
  return DEFAULT_AVATAR_IDS.map((id) => ({
    id,
    url: `/avatars/${id}.svg`,
  }));
}

function resolveHskLevel(learnedCount, thresholds) {
  for (const threshold of thresholds) {
    if (learnedCount >= threshold.minLearned) {
      return threshold.level;
    }
  }
  return 1;
}

router.get('/profile', asyncHandler(async (req, res) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = userResult.rows[0];

  const learnedResult = await query(
    `
      SELECT COUNT(*) AS count
      FROM user_progress
      WHERE user_id = $1 AND status = 'learned'
    `,
    [req.user.id]
  );

  const bookmarkedResult = await query(
    `
      SELECT COUNT(*) AS count
      FROM user_progress
      WHERE user_id = $1 AND status = 'bookmarked'
    `,
    [req.user.id]
  );

  const totalTimeResult = await query(
    `
      SELECT COALESCE(SUM(time_spent), 0) AS total
      FROM daily_records
      WHERE user_id = $1
    `,
    [req.user.id]
  );

  const dailyRecordsResult = await query(
    `
      SELECT date
      FROM daily_records
      WHERE user_id = $1 AND words_learned > 0
      ORDER BY date DESC
    `,
    [req.user.id]
  );

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const dates = dailyRecordsResult.rows.map((row) => row.date);

  if (dates.length > 0) {
    const checkDate = new Date(today);
    if (!dates.includes(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dates.includes(checkDate.toISOString().split('T')[0])) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  const last7Days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const recordResult = await query(
      `
        SELECT words_learned
        FROM daily_records
        WHERE user_id = $1 AND date = $2
      `,
      [req.user.id, dateStr]
    );
    const record = recordResult.rows[0];

    last7Days.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      learned: record ? Number(record.words_learned) : 0,
      isToday: dateStr === today,
    });
  }

  const learnedCount = Number(learnedResult.rows[0]?.count || 0);
  const bookmarkedCount = Number(bookmarkedResult.rows[0]?.count || 0);
  const totalMinutes = Number(totalTimeResult.rows[0]?.total || 0);
  const totalWords = getVocabularyCount();
  const mastery = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;
  const hskLevel = resolveHskLevel(learnedCount, config.hskThresholds);
  const settings = await ensureUserSettings(req.user);
  const voiceSettings = getTeacherVoiceSettings();
  const membership = await getMembershipAccess(req.user.id);
  const invite = await getInviteSummary(req.user.id, buildInviteBaseUrl(req));
  const credential = await getCredentialByUserId(req.user.id);

  res.json({
    user: {
      ...user,
      hskLevel,
    },
    stats: {
      wordsLearned: learnedCount,
      bookmarked: bookmarkedCount,
      totalHours: Math.round(totalMinutes / 60),
      totalMinutes,
      mastery,
      streak,
      last7Days,
      vocabularyCount: totalWords,
    },
    settings,
    voiceSettings,
    membership,
    invite,
    account: {
      username: credential?.username || null,
      hasPassword: Boolean(credential),
    },
    avatarOptions: listAvatarOptions(),
  });
}));

router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await ensureUserSettings(req.user);
  const voiceSettings = getTeacherVoiceSettings();
  const credential = await getCredentialByUserId(req.user.id);

  res.json({
    settings,
    voiceSettings,
    account: {
      username: credential?.username || null,
      hasPassword: Boolean(credential),
    },
  });
}));

router.post('/settings', asyncHandler(async (req, res) => {
  const current = await ensureUserSettings(req.user);
  const next = {
    language: req.body.language !== undefined ? normalizeLanguage(req.body.language) : current.language,
    theme: req.body.theme !== undefined ? normalizeTheme(req.body.theme) : current.theme,
    voiceType: req.body.voiceType !== undefined ? resolveTeacherVoice(req.body.voiceType) : current.voiceType,
    fallbackAvatarId: req.body.fallbackAvatarId !== undefined
      ? resolveFallbackAvatarId(req.body.fallbackAvatarId, buildUserAvatarSeed(req.user))
      : current.fallbackAvatarId,
    preferredAvatarId: req.body.preferredAvatarId !== undefined
      ? (isBuiltinAvatarId(req.body.preferredAvatarId) ? String(req.body.preferredAvatarId) : null)
      : current.preferredAvatarId,
    avatarAssetId: req.body.avatarAssetId !== undefined ? req.body.avatarAssetId : current.avatarAssetId,
  };

  const result = await query(
    `
      UPDATE user_settings
      SET language = $2,
          theme = $3,
          voice_type = $4,
          fallback_avatar_id = $5,
          preferred_avatar_id = $6,
          avatar_asset_id = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING language, theme, voice_type, fallback_avatar_id, preferred_avatar_id, avatar_asset_id
    `,
    [
      req.user.id,
      next.language,
      next.theme,
      next.voiceType,
      next.fallbackAvatarId,
      next.preferredAvatarId,
      next.avatarAssetId,
    ]
  );

  const row = result.rows[0];
  const voiceSettings = getTeacherVoiceSettings();
  res.json({
    settings: {
      language: row.language,
      theme: row.theme,
      voiceType: row.voice_type || '',
      fallbackAvatarId: row.fallback_avatar_id || null,
      preferredAvatarId: row.preferred_avatar_id || null,
      avatarAssetId: row.avatar_asset_id || null,
    },
    voiceSettings,
  });
}));

router.post('/account/bind-credentials', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  const credential = await bindUserCredentials(req.user.id, { username, password });
  res.json({
    account: {
      username: credential.username,
      hasPassword: true,
    },
  });
}));

router.get('/avatar-options', asyncHandler(async (_req, res) => {
  res.json({
    avatars: listAvatarOptions(),
  });
}));

router.post('/avatar/select', asyncHandler(async (req, res) => {
  const avatarId = String(req.body?.avatarId || '').trim();
  if (!isBuiltinAvatarId(avatarId)) {
    throw badRequest('Invalid avatar id', 'INVALID_AVATAR_ID');
  }
  await ensureUserSettings(req.user);

  const result = await query(
    `
      UPDATE user_settings
      SET preferred_avatar_id = $2,
          avatar_asset_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING preferred_avatar_id, avatar_asset_id, fallback_avatar_id
    `,
    [req.user.id, avatarId]
  );

  res.json({
    avatar: {
      preferredAvatarId: result.rows[0]?.preferred_avatar_id || avatarId,
      avatarAssetId: null,
      url: `/avatars/${avatarId}.svg`,
    },
  });
}));

router.post('/avatar/upload', upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file?.buffer?.length) {
    throw badRequest('Avatar image is required', 'AVATAR_REQUIRED');
  }
  await ensureUserSettings(req.user);

  const asset = await createNormalizedImageAsset({
    ownerUserId: req.user.id,
    scope: 'user',
    category: 'avatar',
    fileName: req.file.originalname || 'avatar',
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    square: true,
    maxWidth: 512,
    maxHeight: 512,
    quality: 88,
  });

  await query(
    `
      UPDATE user_settings
      SET avatar_asset_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `,
    [req.user.id, asset.id]
  );

  res.json({
    avatar: {
      avatarAssetId: asset.id,
      url: asMediaUrl(asset.id),
    },
  });
}));

router.post('/tts-preview', asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) {
    return res.status(400).json({
      error: 'Text is required',
      code: 'TEXT_REQUIRED',
    });
  }

  const settings = await ensureUserSettings(req.user);
  const requestedVoiceType = req.body.voiceType !== undefined ? req.body.voiceType : settings.voiceType;
  const audio = await synthesizeDialogueText(text, {
    voiceType: resolveTeacherVoice(requestedVoiceType),
  });

  res.json({
    audio,
  });
}));

router.get('/collection', asyncHandler(async (req, res) => {
  const bookmarksResult = await query(
    `
      SELECT word_id, updated_at
      FROM user_progress
      WHERE user_id = $1 AND status = 'bookmarked'
      ORDER BY updated_at DESC
    `,
    [req.user.id]
  );

  res.json({ bookmarks: bookmarksResult.rows });
}));

router.post('/time', asyncHandler(async (req, res) => {
  const minutesValue = Number.parseInt(req.body.minutes, 10);
  const secondsValue = Number.parseInt(req.body.seconds, 10);
  const normalizedMinutes = Number.isFinite(minutesValue)
    ? minutesValue
    : Number.isFinite(secondsValue)
      ? Math.floor(secondsValue / 60)
      : 0;

  if (normalizedMinutes <= 0) {
    return res.json({ success: true, minutesRecorded: 0 });
  }

  const today = new Date().toISOString().split('T')[0];
  await query(
    `
      INSERT INTO daily_records (user_id, date, words_learned, time_spent)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT(user_id, date) DO UPDATE SET time_spent = daily_records.time_spent + EXCLUDED.time_spent
    `,
    [req.user.id, today, normalizedMinutes]
  );

  return res.json({ success: true, minutesRecorded: normalizedMinutes });
}));

router.get('/invite', asyncHandler(async (req, res) => {
  const invite = await getInviteSummary(req.user.id, buildInviteBaseUrl(req));
  const membership = await getMembershipAccess(req.user.id);

  res.json({
    invite,
    membership,
  });
}));

export default router;
