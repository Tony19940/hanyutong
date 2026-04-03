import { Pool } from 'pg';
import { newDb } from 'pg-mem';
import { config } from './config.js';

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS keys (
      id SERIAL PRIMARY KEY,
      key_code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'expired')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      activated_at TIMESTAMPTZ,
      expired_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      last_extended_at TIMESTAMPTZ,
      duration_days INTEGER NOT NULL DEFAULT 30,
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
      invite_code TEXT UNIQUE,
      invited_by_user_id INTEGER,
      referral_bound_at TIMESTAMPTZ,
      first_paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS user_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      language TEXT NOT NULL DEFAULT 'zh-CN',
      theme TEXT NOT NULL DEFAULT 'dark',
      voice_type TEXT NOT NULL DEFAULT '',
      fallback_avatar_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  `
    CREATE TABLE IF NOT EXISTS membership_access (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      plan_type TEXT NOT NULL DEFAULT 'free' CHECK (
        plan_type IN ('free', 'trial', 'invited_trial', 'month_card', 'referral_reward', 'legacy_permanent')
      ),
      status TEXT NOT NULL DEFAULT 'free' CHECK (
        status IN ('free', 'trial_active', 'trial_expired', 'premium_active', 'premium_expired')
      ),
      access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'premium')),
      expires_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source_key_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      inviter_user_id INTEGER NOT NULL,
      invitee_user_id INTEGER NOT NULL UNIQUE,
      invite_code TEXT NOT NULL,
      reward_days INTEGER NOT NULL DEFAULT 7,
      bound_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      first_paid_reward_granted_at TIMESTAMPTZ
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS entitlement_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK (
        event_type IN ('trial_started', 'paid_activation', 'key_extended', 'referral_reward', 'manual_adjustment')
      ),
      plan_type TEXT,
      days_delta INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      related_key_id INTEGER,
      related_referral_id INTEGER,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  'ALTER TABLE keys ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ',
  'ALTER TABLE keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ',
  'ALTER TABLE keys ADD COLUMN IF NOT EXISTS last_extended_at TIMESTAMPTZ',
  `ALTER TABLE keys ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT ${config.premiumDurationDays}`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE`,
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by_user_id INTEGER',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bound_at TIMESTAMPTZ',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_paid_at TIMESTAMPTZ',
  'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'ALTER TABLE keys DROP CONSTRAINT IF EXISTS keys_status_check',
  "UPDATE keys SET status = 'active' WHERE status = 'activated'",
  `ALTER TABLE keys ADD CONSTRAINT keys_status_check CHECK (status IN ('unused', 'active', 'expired'))`,
  'ALTER TABLE keys DROP CONSTRAINT IF EXISTS keys_user_id_fkey',
  'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_key_id_fkey',
  'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_invited_by_user_id_fkey',
  'ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey',
  'ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey',
  'ALTER TABLE daily_records DROP CONSTRAINT IF EXISTS daily_records_user_id_fkey',
  'ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey',
  'ALTER TABLE membership_access DROP CONSTRAINT IF EXISTS membership_access_user_id_fkey',
  'ALTER TABLE membership_access DROP CONSTRAINT IF EXISTS membership_access_source_key_id_fkey',
  'ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_inviter_user_id_fkey',
  'ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_invitee_user_id_fkey',
  'ALTER TABLE entitlement_events DROP CONSTRAINT IF EXISTS entitlement_events_user_id_fkey',
  'ALTER TABLE entitlement_events DROP CONSTRAINT IF EXISTS entitlement_events_related_key_id_fkey',
  'ALTER TABLE entitlement_events DROP CONSTRAINT IF EXISTS entitlement_events_related_referral_id_fkey',
  'ALTER TABLE keys ADD CONSTRAINT keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE users ADD CONSTRAINT users_key_id_fkey FOREIGN KEY (key_id) REFERENCES keys(id) ON DELETE SET NULL',
  'ALTER TABLE users ADD CONSTRAINT users_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE user_progress ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE daily_records ADD CONSTRAINT daily_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE membership_access ADD CONSTRAINT membership_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE membership_access ADD CONSTRAINT membership_access_source_key_id_fkey FOREIGN KEY (source_key_id) REFERENCES keys(id) ON DELETE SET NULL',
  'ALTER TABLE referrals ADD CONSTRAINT referrals_inviter_user_id_fkey FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE referrals ADD CONSTRAINT referrals_invitee_user_id_fkey FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE entitlement_events ADD CONSTRAINT entitlement_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE entitlement_events ADD CONSTRAINT entitlement_events_related_key_id_fkey FOREIGN KEY (related_key_id) REFERENCES keys(id) ON DELETE SET NULL',
  'ALTER TABLE entitlement_events ADD CONSTRAINT entitlement_events_related_referral_id_fkey FOREIGN KEY (related_referral_id) REFERENCES referrals(id) ON DELETE SET NULL',
  'CREATE INDEX IF NOT EXISTS idx_keys_code ON keys(key_code)',
  'CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status)',
  'CREATE INDEX IF NOT EXISTS idx_keys_user ON keys(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_keys_expires_at ON keys(expires_at)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code)',
  'CREATE INDEX IF NOT EXISTS idx_users_invited_by_user ON users(invited_by_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_progress_status ON user_progress(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_daily_user ON daily_records(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
  'CREATE INDEX IF NOT EXISTS idx_membership_user ON membership_access(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_membership_status ON membership_access(status)',
  'CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_entitlement_events_user ON entitlement_events(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_entitlement_events_type ON entitlement_events(event_type)',
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
