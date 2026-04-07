import request from 'supertest';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';

process.env.ADMIN_PASSWORD = 'secret-admin';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';

let app;
let dbModule;

async function seedKey(keyCode) {
  await dbModule.query('INSERT INTO keys (key_code, serial_number) VALUES ($1, $2)', [keyCode, keyCode.slice(-3)]);
}

async function loginWithKey(keyCode, telegramId = `tg-${keyCode}`, extras = {}) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ keyCode, telegramId, name: `User ${keyCode}`, ...extras });

  return response.body;
}

async function startTrial(telegramId, extras = {}) {
  const response = await request(app)
    .post('/api/auth/start-trial')
    .send({ telegramId, name: `Trial ${telegramId}`, ...extras });

  return response.body;
}

beforeAll(async () => {
  const serverModule = await import('../server/index.js');
  dbModule = await import('../server/db.js');
  app = await serverModule.createApp();
});

beforeEach(async () => {
  await dbModule.query('DELETE FROM audit_logs');
  await dbModule.query('DELETE FROM admin_sessions');
  await dbModule.query('DELETE FROM sessions');
  await dbModule.query('DELETE FROM entitlement_events');
  await dbModule.query('DELETE FROM referrals');
  await dbModule.query('DELETE FROM membership_access');
  await dbModule.query('DELETE FROM user_progress');
  await dbModule.query('DELETE FROM daily_records');
  await dbModule.query('DELETE FROM user_settings');
  await dbModule.query('DELETE FROM users');
  await dbModule.query('DELETE FROM keys');

  await seedKey('HYT-2026-AAAA-0001');
  await seedKey('HYT-2026-BBBB-0002');
  await seedKey('HYT-2026-CCCC-0003');
});

afterAll(async () => {
  await dbModule.closeDb();
});

describe('auth and user permissions', () => {
  it('returns JSON 404 for unknown api routes', async () => {
    const response = await request(app).get('/api/missing-route');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('API_ROUTE_NOT_FOUND');
  });

  it('rejects user endpoints without a valid session', async () => {
    const response = await request(app).get('/api/user/profile');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('MISSING_USER_TOKEN');
  });

  it('creates an independent session token and verifies the current user from auth header', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ keyCode: 'HYT-2026-AAAA-0001', telegramId: 'tg-1', name: 'Alice' });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.token).not.toBe('HYT-2026-AAAA-0001');

    const verify = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ token: 'ignored-old-shape' });

    expect(verify.status).toBe(200);
    expect(verify.body.user.name).toBe('Alice');
    expect(verify.body.membership.accessLevel).toBe('premium');
    expect(verify.body.invite.code).toBeTruthy();
  });

  it('starts a 3-day trial and downgrades quiz access after expiry while keeping word cards free', async () => {
    const trial = await startTrial('trial-user-1');
    expect(trial.membership.status).toBe('trial_active');
    expect(trial.membership.accessLevel).toBe('premium');

    await dbModule.query(
      `
        UPDATE membership_access
        SET expires_at = NOW() - INTERVAL '1 day'
        WHERE user_id = $1
      `,
      [trial.user.id]
    );

    const verify = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${trial.token}`);

    expect(verify.status).toBe(200);
    expect(verify.body.membership.status).toBe('trial_expired');
    expect(verify.body.membership.accessLevel).toBe('free');

    const homeWords = await request(app)
      .get('/api/words/next?mode=home')
      .set('Authorization', `Bearer ${trial.token}`);

    expect(homeWords.status).toBe(200);
    expect(Array.isArray(homeWords.body.words)).toBe(true);

    const quizWords = await request(app)
      .get('/api/words/next?mode=quiz')
      .set('Authorization', `Bearer ${trial.token}`);

    expect(quizWords.status).toBe(401);
    expect(quizWords.body.code).toBe('PREMIUM_REQUIRED');
  });

  it('ignores spoofed query userId and only returns the authenticated user profile', async () => {
    const alice = await loginWithKey('HYT-2026-AAAA-0001', 'alice');
    const bob = await loginWithKey('HYT-2026-BBBB-0002', 'bob');

    const response = await request(app)
      .get(`/api/user/profile?userId=${bob.user.id}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(alice.user.id);
    expect(response.body.user.id).not.toBe(bob.user.id);
  });

  it('returns dialogue scenarios and reports missing dialogue service configuration in test env', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'dialogue-user');

    const response = await request(app)
      .get('/api/dialogue/scenarios')
      .set('Authorization', `Bearer ${login.token}`);

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(false);
    expect(response.body.scenarios.length).toBeGreaterThan(0);
    expect(response.body.missing).toContain('DOUBAO_ASR_APP_ID');
  });

  it('rejects starting dialogue session when dialogue configuration is missing', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'dialogue-start-user');

    const response = await request(app)
      .post('/api/dialogue/session/start')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ scenarioId: 'greeting' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('DIALOGUE_CONFIG_MISSING');
  });

  it('returns default user settings for a newly logged in user', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'settings-default-user');

    const response = await request(app)
      .get('/api/user/settings')
      .set('Authorization', `Bearer ${login.token}`);

    expect(response.status).toBe(200);
    expect(response.body.settings.language).toBe('zh-CN');
    expect(response.body.settings.theme).toBe('dark');
    expect(response.body.settings.voiceType).toBe('BV705_streaming');
    expect(response.body.settings.fallbackAvatarId).toMatch(/^animal-/);
    expect(response.body.voiceSettings.defaultVoiceType).toBe('BV705_streaming');
    expect(Array.isArray(response.body.voiceSettings.availableVoices)).toBe(true);
    expect(response.body.voiceSettings.availableVoices.length).toBeGreaterThan(0);
  });

  it('persists user settings updates and returns them from profile', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'settings-update-user');

    const update = await request(app)
      .post('/api/user/settings')
      .set('Authorization', `Bearer ${login.token}`)
      .send({
        language: 'en',
        theme: 'light',
        voiceType: 'BV001_streaming',
        fallbackAvatarId: 'animal-cat',
      });

    expect(update.status).toBe(200);
    expect(update.body.settings.language).toBe('en');
    expect(update.body.settings.theme).toBe('light');
    expect(update.body.settings.voiceType).toBe('BV001_streaming');
    expect(update.body.settings.fallbackAvatarId).toBe('animal-cat');
    expect(update.body.settings.preferredAvatarId).toBe(null);
    expect(update.body.settings.avatarAssetId).toBe(null);

    const profile = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${login.token}`);

    expect(profile.status).toBe(200);
    expect(profile.body.settings.language).toBe('en');
    expect(profile.body.settings.theme).toBe('light');
    expect(profile.body.settings.voiceType).toBe('BV001_streaming');
    expect(profile.body.settings.fallbackAvatarId).toBe('animal-cat');
    expect(profile.body.settings.preferredAvatarId).toBe(null);
    expect(profile.body.settings.avatarAssetId).toBe(null);
    expect(profile.body.voiceSettings.defaultVoiceType).toBe('BV705_streaming');
  });

  it('falls back to a deterministic built-in avatar when requested avatar id is invalid', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'avatar-fallback-user');

    const update = await request(app)
      .post('/api/user/settings')
      .set('Authorization', `Bearer ${login.token}`)
      .send({
        fallbackAvatarId: 'not-a-real-avatar',
      });

    expect(update.status).toBe(200);
    expect(update.body.settings.fallbackAvatarId).toMatch(/^animal-/);
  });

  it('falls back to the default teacher voice when the requested voice is unavailable', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'voice-fallback-user');

    const update = await request(app)
      .post('/api/user/settings')
      .set('Authorization', `Bearer ${login.token}`)
      .send({
        voiceType: 'NOT_A_REAL_VOICE',
      });

    expect(update.status).toBe(200);
    expect(update.body.settings.voiceType).toBe('BV705_streaming');
  });

  it('grants a referral reward only once after the invitee first pays', async () => {
    const inviter = await loginWithKey('HYT-2026-AAAA-0001', 'inviter');
    const inviteCode = inviter.invite.code;

    const inviteeTrial = await startTrial('invitee-trial-user', { inviteCode });
    expect(inviteeTrial.membership.planType).toBe('invited_trial');

    const firstPaid = await loginWithKey('HYT-2026-BBBB-0002', 'invitee-trial-user');
    expect(firstPaid.membership.accessLevel).toBe('premium');

    const inviterInviteAfterFirstPay = await request(app)
      .get('/api/user/invite')
      .set('Authorization', `Bearer ${inviter.token}`);

    expect(inviterInviteAfterFirstPay.status).toBe(200);
    expect(inviterInviteAfterFirstPay.body.invite.stats.convertedCount).toBe(1);
    expect(inviterInviteAfterFirstPay.body.invite.stats.rewardDaysEarned).toBe(7);

    const renewal = await loginWithKey('HYT-2026-CCCC-0003', 'invitee-trial-user');
    expect(renewal.membership.accessLevel).toBe('premium');

    const inviterInviteAfterRenewal = await request(app)
      .get('/api/user/invite')
      .set('Authorization', `Bearer ${inviter.token}`);

    expect(inviterInviteAfterRenewal.status).toBe(200);
    expect(inviterInviteAfterRenewal.body.invite.stats.convertedCount).toBe(1);
    expect(inviterInviteAfterRenewal.body.invite.stats.rewardDaysEarned).toBe(7);
  });
});

describe('learning progress idempotency', () => {
  it('counts learned words only once for repeated learned actions', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'learner-1');
    const token = login.token;

    const first = await request(app)
      .post('/api/words/action')
      .set('Authorization', `Bearer ${token}`)
      .send({ wordId: 1, action: 'learned' });

    const second = await request(app)
      .post('/api/words/action')
      .set('Authorization', `Bearer ${token}`)
      .send({ wordId: 1, action: 'learned' });

    const profile = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(first.body.countedAsLearned).toBe(true);
    expect(second.body.countedAsLearned).toBe(false);
    expect(profile.body.stats.wordsLearned).toBe(1);
  });

  it('counts bookmarked to learned transition once', async () => {
    const login = await loginWithKey('HYT-2026-AAAA-0001', 'learner-2');
    const token = login.token;

    const bookmarked = await request(app)
      .post('/api/words/action')
      .set('Authorization', `Bearer ${token}`)
      .send({ wordId: 2, action: 'bookmarked' });

    const learned = await request(app)
      .post('/api/words/action')
      .set('Authorization', `Bearer ${token}`)
      .send({ wordId: 2, action: 'learned' });

    const profile = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(bookmarked.body.countedAsLearned).toBe(false);
    expect(learned.body.countedAsLearned).toBe(true);
    expect(profile.body.stats.wordsLearned).toBe(1);
  });
});

describe('admin auth and key management', () => {
  it('rejects admin endpoints without login', async () => {
    const response = await request(app).get('/api/admin/keys');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('MISSING_ADMIN_TOKEN');
  });

  it('supports admin login, generate/list, delete unused keys, and extend expired bound keys', async () => {
    const login = await request(app)
      .post('/api/admin/login')
      .send({ password: 'secret-admin' });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const authHeader = { Authorization: `Bearer ${login.body.token}` };

    const generated = await request(app)
      .post('/api/admin/generate-key')
      .set(authHeader)
      .send({ count: 1, durationDays: 30 });

    expect(generated.status).toBe(200);
    expect(generated.body.count).toBe(1);

    const list = await request(app)
      .get('/api/admin/keys')
      .set(authHeader);

    expect(list.status).toBe(200);
    const generatedKey = list.body.keys.find((row) => row.key_code === generated.body.keys[0].keyCode);
    expect(generatedKey).toBeTruthy();
    expect(generatedKey.status).toBe('unused');

    const deleteResponse = await request(app)
      .delete(`/api/admin/keys/${generatedKey.id}`)
      .set(authHeader);

    expect(deleteResponse.status).toBe(200);

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ keyCode: 'HYT-2026-AAAA-0001', telegramId: 'bound-user', name: 'Bound User' });

    expect(userLogin.status).toBe(200);

    const boundKey = await dbModule.query('SELECT * FROM keys WHERE key_code = $1', ['HYT-2026-AAAA-0001']);
    const boundKeyId = boundKey.rows[0].id;

    await dbModule.query(
      `
        UPDATE keys
        SET status = 'expired',
            expires_at = NOW() - INTERVAL '1 day'
        WHERE id = $1
      `,
      [boundKeyId]
    );

    const extend = await request(app)
      .post(`/api/admin/keys/${boundKeyId}/extend`)
      .set(authHeader)
      .send({ expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() });

    expect(extend.status).toBe(200);
    expect(extend.body.key.status).toBe('active');

    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ keyCode: 'HYT-2026-AAAA-0001', telegramId: 'bound-user', name: 'Bound User' });

    expect(relogin.status).toBe(200);
    expect(relogin.body.membership.accessLevel).toBe('premium');

    const expire = await request(app)
      .post(`/api/admin/keys/${boundKeyId}/expire`)
      .set(authHeader);

    expect(expire.status).toBe(200);
  });
});
