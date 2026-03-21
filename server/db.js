import { Pool } from 'pg';
import { newDb } from 'pg-mem';
import { config } from './config.js';

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS keys (
      id SERIAL PRIMARY KEY,
      key_code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'activated', 'expired')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      activated_at TIMESTAMPTZ,
      expired_at TIMESTAMPTZ,
      user_id INTEGER,
      serial_number TEXT
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT UNIQUE,
      name TEXT NOT NULL DEFAULT 'User',
      avatar_url TEXT,
      key_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS user_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('learned', 'bookmarked')),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, word_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS daily_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      words_learned INTEGER NOT NULL DEFAULT 0,
      time_spent INTEGER NOT NULL DEFAULT 0,
      UNIQUE (user_id, date)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id SERIAL PRIMARY KEY,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'system')),
      actor_session_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  'ALTER TABLE keys ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ',
  'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'ALTER TABLE keys DROP CONSTRAINT IF EXISTS keys_user_id_fkey',
  'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_key_id_fkey',
  'ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey',
  'ALTER TABLE daily_records DROP CONSTRAINT IF EXISTS daily_records_user_id_fkey',
  'ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey',
  'ALTER TABLE keys ADD CONSTRAINT keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE users ADD CONSTRAINT users_key_id_fkey FOREIGN KEY (key_id) REFERENCES keys(id) ON DELETE SET NULL',
  'ALTER TABLE user_progress ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE daily_records ADD CONSTRAINT daily_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'CREATE INDEX IF NOT EXISTS idx_keys_code ON keys(key_code)',
  'CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status)',
  'CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_progress_status ON user_progress(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_daily_user ON daily_records(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
];

let pool = null;
let initialized = false;

function createPool() {
  if (config.nodeEnv === 'test' && !config.databaseUrl) {
    const memoryDb = newDb({
      autoCreateForeignKeyIndices: true,
    });
    const { Pool: MemoryPool } = memoryDb.adapters.createPg();
    return new MemoryPool();
  }

  return new Pool({
    connectionString: config.databaseUrl,
  });
}

export async function initDb() {
  if (initialized) {
    return pool;
  }

  pool = createPool();

  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  initialized = true;
  return pool;
}

async function requirePool() {
  if (!initialized) {
    await initDb();
  }

  return pool;
}

export async function query(text, params = [], client = null) {
  if (client) {
    return client.query(text, params);
  }

  const activePool = await requirePool();
  return activePool.query(text, params);
}

export async function withTransaction(callback) {
  const activePool = await requirePool();
  const client = await activePool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDb() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
  initialized = false;
}
