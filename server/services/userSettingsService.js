import { query } from '../db.js';
import { buildUserAvatarSeed, resolveFallbackAvatarId } from './avatarService.js';
import { resolveTeacherVoice } from './voiceInventoryService.js';

export const DEFAULT_USER_SETTINGS = {
  language: 'zh-CN',
  theme: 'dark',
  voiceType: '',
  fallbackAvatarId: null,
};

export function normalizeLanguage(value) {
  return ['zh-CN', 'en', 'km'].includes(value) ? value : DEFAULT_USER_SETTINGS.language;
}

export function normalizeTheme(value) {
  return ['dark', 'light'].includes(value) ? value : DEFAULT_USER_SETTINGS.theme;
}

export async function ensureUserSettingsForDialogue(user) {
  const userId = typeof user === 'object' ? user?.id : user;
  const fallbackAvatarId = resolveFallbackAvatarId(null, buildUserAvatarSeed(user));
  const result = await query(
    `
      INSERT INTO user_settings (user_id, language, theme, voice_type, fallback_avatar_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
      RETURNING language, theme, voice_type, fallback_avatar_id
    `,
    [userId, DEFAULT_USER_SETTINGS.language, DEFAULT_USER_SETTINGS.theme, DEFAULT_USER_SETTINGS.voiceType, fallbackAvatarId]
  );

  const row = result.rows[0];
  let resolvedFallbackAvatarId = row.fallback_avatar_id || null;
  if (!resolvedFallbackAvatarId) {
    resolvedFallbackAvatarId = fallbackAvatarId;
    await query(
      `
        UPDATE user_settings
        SET fallback_avatar_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `,
      [userId, resolvedFallbackAvatarId]
    );
  }

  return {
    language: row.language || DEFAULT_USER_SETTINGS.language,
    theme: row.theme || DEFAULT_USER_SETTINGS.theme,
    voiceType: resolveTeacherVoice(row.voice_type || DEFAULT_USER_SETTINGS.voiceType),
    fallbackAvatarId: resolvedFallbackAvatarId,
  };
}
