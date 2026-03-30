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

async function loginWithKey(keyCode, telegramId = `tg-${keyCode}`) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ keyCode, telegramId, name: `User ${keyCode}` });

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
  await dbModule.query('DELETE FROM user_progress');
  await dbModule.query('DELETE FROM daily_records');
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

  it('supports admin login, generate/list, expire, and delete for non-activated keys', async () => {
    const login = await request(app)
      .post('/api/admin/login')
      .send({ password: 'secret-admin' });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const authHeader = { Authorization: `Bearer ${login.body.token}` };

    const generated = await request(app)
      .post('/api/admin/generate-key')
      .set(authHeader)
      .send({ count: 1 });

    expect(generated.status).toBe(200);
    expect(generated.body.count).toBe(1);

    const list = await request(app)
      .get('/api/admin/keys')
      .set(authHeader);

    expect(list.status).toBe(200);
    const generatedKey = list.body.keys.find((row) => row.key_code === generated.body.keys[0].keyCode);
    expect(generatedKey).toBeTruthy();

    const expire = await request(app)
      .post(`/api/admin/keys/${generatedKey.id}/expire`)
      .set(authHeader);

    expect(expire.status).toBe(200);

    const deleteResponse = await request(app)
      .delete(`/api/admin/keys/${generatedKey.id}`)
      .set(authHeader);

    expect(deleteResponse.status).toBe(200);
  });
});
