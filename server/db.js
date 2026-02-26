import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'hanyutong.db');

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'unused' CHECK(status IN ('unused', 'activated', 'expired')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    activated_at DATETIME,
    user_id INTEGER,
    serial_number TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE,
    name TEXT NOT NULL DEFAULT 'User',
    avatar_url TEXT,
    key_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (key_id) REFERENCES keys(id)
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('learned', 'bookmarked')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, word_id)
  );

  CREATE TABLE IF NOT EXISTS daily_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    words_learned INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_keys_code ON keys(key_code);
  CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
  CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_progress_status ON user_progress(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_daily_user ON daily_records(user_id);
`);

export default db;
