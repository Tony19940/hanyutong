import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hanyutong-tests-'));
const dbPath = path.join(tempDir, 'test.db');

process.env.DB_PATH = dbPath;
process.env.ADMIN_PASSWORD = 'secret-admin';
process.env.NODE_ENV = 'test';

let app;
let db;

function seedKey(keyCode) {
  db.prepare('INSERT INTO keys (key_code, serial_number) VALUES (?, ?)').run(keyCode, keyCode.slice(-3));
}

async function loginWithKey(keyCode, telegramId = `tg-${keyCode}`) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ keyCode, telegramId, name: `User ${keyCode}` });

  return response.body;
}

beforeAll(async () => {
  const serverModule = await import('../server/index.js');
  const dbModule = await import('../server/db.js');
  app = serverModule.createApp();
  db = dbModule.default;
});

beforeEach(() => {
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM admin_sessions;
    DELETE FROM sessions;
    DELETE FROM user_progress;
    DELETE FROM daily_records;
    DELETE FROM keys;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);

  seedKey('HYT-2026-AAAA-0001');
  seedKey('HYT-2026-BBBB-0002');
  seedKey('HYT-2026-CCCC-0003');
});

afterAll(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
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
