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
      preferred_avatar_id TEXT,
      avatar_asset_id UUID,
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
    CREATE TABLE IF NOT EXISTS word_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      interval INTEGER NOT NULL DEFAULT 0,
      ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review TIMESTAMPTZ,
      last_review TIMESTAMPTZ,
      quality INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
      review_words INTEGER NOT NULL DEFAULT 0,
      time_spent INTEGER NOT NULL DEFAULT 0,
      goal_target INTEGER NOT NULL DEFAULT 8,
      goal_completed BOOLEAN NOT NULL DEFAULT FALSE,
      quiz_questions_used INTEGER NOT NULL DEFAULT 0,
      dialogue_rounds_used INTEGER NOT NULL DEFAULT 0,
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `
    CREATE TABLE IF NOT EXISTS media_assets (
      id UUID PRIMARY KEY,
      owner_user_id INTEGER,
      scope TEXT NOT NULL DEFAULT 'admin' CHECK (scope IN ('admin', 'user')),
      category TEXT NOT NULL CHECK (category IN ('banner', 'popup', 'avatar')),
      mime_type TEXT NOT NULL,
      file_name TEXT,
      bytes BYTEA NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS home_banners (
      id SERIAL PRIMARY KEY,
      asset_id UUID NOT NULL,
      title TEXT,
      link_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS app_popups (
      id SERIAL PRIMARY KEY,
      asset_id UUID NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      link_url TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS popup_impressions (
      id SERIAL PRIMARY KEY,
      popup_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      impression_date TEXT NOT NULL,
      clicked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (popup_id, user_id, impression_date)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS app_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      event_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS user_credentials (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      username_normalized TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  'ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_avatar_id TEXT',
  'ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar_asset_id UUID',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS interval INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS repetitions INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS last_review TIMESTAMPTZ',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS quality INTEGER',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS review_words INTEGER NOT NULL DEFAULT 0',
  `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS goal_target INTEGER NOT NULL DEFAULT ${config.dailyStudyGoal}`,
  'ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS goal_completed BOOLEAN NOT NULL DEFAULT FALSE',
  'ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS quiz_questions_used INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS dialogue_rounds_used INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
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
  'ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_user_id_fkey',
  'ALTER TABLE daily_records DROP CONSTRAINT IF EXISTS daily_records_user_id_fkey',
  'ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey',
  'ALTER TABLE membership_access DROP CONSTRAINT IF EXISTS membership_access_user_id_fkey',
  'ALTER TABLE membership_access DROP CONSTRAINT IF EXISTS membership_access_source_key_id_fkey',
  'ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_inviter_user_id_fkey',
  'ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_invitee_user_id_fkey',
  'ALTER TABLE entitlement_events DROP CONSTRAINT IF EXISTS entitlement_events_user_id_fkey',
  'ALTER TABLE entitlement_events DROP CONSTRAINT IF EXISTS entitlement_events_related_key_id_fkey',
  'ALTER TABLE entitlement_events DROP CONSTRAINT IF EXISTS entitlement_events_related_referral_id_fkey',
  'ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_owner_user_id_fkey',
  'ALTER TABLE home_banners DROP CONSTRAINT IF EXISTS home_banners_asset_id_fkey',
  'ALTER TABLE app_popups DROP CONSTRAINT IF EXISTS app_popups_asset_id_fkey',
  'ALTER TABLE popup_impressions DROP CONSTRAINT IF EXISTS popup_impressions_popup_id_fkey',
  'ALTER TABLE popup_impressions DROP CONSTRAINT IF EXISTS popup_impressions_user_id_fkey',
  'ALTER TABLE app_events DROP CONSTRAINT IF EXISTS app_events_user_id_fkey',
  'ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_user_id_fkey',
  'ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_avatar_asset_id_fkey',
  'ALTER TABLE keys ADD CONSTRAINT keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE users ADD CONSTRAINT users_key_id_fkey FOREIGN KEY (key_id) REFERENCES keys(id) ON DELETE SET NULL',
  'ALTER TABLE users ADD CONSTRAINT users_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE user_progress ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE word_progress ADD CONSTRAINT word_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE daily_records ADD CONSTRAINT daily_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE membership_access ADD CONSTRAINT membership_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE membership_access ADD CONSTRAINT membership_access_source_key_id_fkey FOREIGN KEY (source_key_id) REFERENCES keys(id) ON DELETE SET NULL',
  'ALTER TABLE referrals ADD CONSTRAINT referrals_inviter_user_id_fkey FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE referrals ADD CONSTRAINT referrals_invitee_user_id_fkey FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE entitlement_events ADD CONSTRAINT entitlement_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE entitlement_events ADD CONSTRAINT entitlement_events_related_key_id_fkey FOREIGN KEY (related_key_id) REFERENCES keys(id) ON DELETE SET NULL',
  'ALTER TABLE entitlement_events ADD CONSTRAINT entitlement_events_related_referral_id_fkey FOREIGN KEY (related_referral_id) REFERENCES referrals(id) ON DELETE SET NULL',
  'ALTER TABLE media_assets ADD CONSTRAINT media_assets_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE home_banners ADD CONSTRAINT home_banners_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE CASCADE',
  'ALTER TABLE app_popups ADD CONSTRAINT app_popups_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE CASCADE',
  'ALTER TABLE popup_impressions ADD CONSTRAINT popup_impressions_popup_id_fkey FOREIGN KEY (popup_id) REFERENCES app_popups(id) ON DELETE CASCADE',
  'ALTER TABLE popup_impressions ADD CONSTRAINT popup_impressions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE app_events ADD CONSTRAINT app_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE user_credentials ADD CONSTRAINT user_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'ALTER TABLE user_settings ADD CONSTRAINT user_settings_avatar_asset_id_fkey FOREIGN KEY (avatar_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL',
  'CREATE INDEX IF NOT EXISTS idx_keys_code ON keys(key_code)',
  'CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status)',
  'CREATE INDEX IF NOT EXISTS idx_keys_user ON keys(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_keys_expires_at ON keys(expires_at)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code)',
  'CREATE INDEX IF NOT EXISTS idx_users_invited_by_user ON users(invited_by_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_progress_status ON user_progress(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_word_progress_user ON word_progress(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_word_progress_due ON word_progress(user_id, next_review)',
  'CREATE INDEX IF NOT EXISTS idx_daily_user ON daily_records(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_daily_user_date ON daily_records(user_id, date)',
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
  'CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets(owner_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category)',
  'CREATE INDEX IF NOT EXISTS idx_home_banners_sort ON home_banners(sort_order, is_active)',
  'CREATE INDEX IF NOT EXISTS idx_app_popups_window ON app_popups(starts_at, ends_at, is_active)',
  'CREATE INDEX IF NOT EXISTS idx_popup_impressions_user ON popup_impressions(user_id, impression_date)',
  'CREATE INDEX IF NOT EXISTS idx_app_events_name_date ON app_events(event_name, event_date)',
  'CREATE INDEX IF NOT EXISTS idx_app_events_user_date ON app_events(user_id, event_date)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credentials_username_norm ON user_credentials(username_normalized)',
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
