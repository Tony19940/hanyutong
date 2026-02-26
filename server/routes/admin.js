import { Router } from 'express';
import db from '../db.js';
import crypto from 'crypto';

const router = Router();

// Simple admin auth middleware
function adminAuth(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.adminPassword;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: '无权访问' });
  }
  next();
}

// Generate a random key in HYT-YYYY-XXXX-XXXX format
function generateKeyCode() {
  const year = new Date().getFullYear();
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  return `HYT-${year}-${part1}-${part2}`;
}

// POST /api/admin/generate-key - Generate new keys
router.post('/generate-key', adminAuth, (req, res) => {
  const count = Math.min(parseInt(req.body.count) || 1, 100);
  const keys = [];

  const insert = db.prepare(
    'INSERT INTO keys (key_code, serial_number) VALUES (?, ?)'
  );

  const lastKey = db.prepare('SELECT MAX(id) as maxId FROM keys').get();
  let serialBase = (lastKey.maxId || 0) + 1;

  const generateAll = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      const keyCode = generateKeyCode();
      const serialNumber = String(serialBase + i).padStart(3, '0');
      try {
        insert.run(keyCode, serialNumber);
        keys.push({ keyCode, serialNumber });
      } catch (e) {
        // Key collision, try again
        i--;
      }
    }
  });

  generateAll();
  res.json({ keys, count: keys.length });
});

// GET /api/admin/keys - List all keys
router.get('/keys', adminAuth, (req, res) => {
  const status = req.query.status; // 'unused', 'activated', 'expired', or null for all
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  let query = `
    SELECT k.*, u.name as user_name, u.telegram_id
    FROM keys k
    LEFT JOIN users u ON k.user_id = u.id
  `;
  const params = [];

  if (status) {
    query += ' WHERE k.status = ?';
    params.push(status);
  }

  query += ' ORDER BY k.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const keys = db.prepare(query).all(...params);

  // Stats
  const total = db.prepare('SELECT COUNT(*) as count FROM keys').get();
  const activated = db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'activated'").get();
  const unused = db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'unused'").get();

  res.json({
    keys,
    stats: {
      total: total.count,
      activated: activated.count,
      unused: unused.count,
    },
    pagination: { page, limit, total: total.count }
  });
});

// DELETE /api/admin/keys/:id - Delete a key
router.delete('/keys/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const key = db.prepare('SELECT * FROM keys WHERE id = ?').get(id);
  if (!key) return res.status(404).json({ error: 'Key not found' });

  if (key.status === 'activated') {
    return res.status(400).json({ error: '已激活的密钥无法删除' });
  }

  db.prepare('DELETE FROM keys WHERE id = ?').run(id);
  res.json({ success: true });
});

// GET /api/admin/stats - Dashboard stats
router.get('/stats', adminAuth, (req, res) => {
  const totalKeys = db.prepare('SELECT COUNT(*) as count FROM keys').get();
  const activatedKeys = db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'activated'").get();
  const unusedKeys = db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'unused'").get();
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

  const todayDate = new Date().toISOString().split('T')[0];
  const activeToday = db.prepare(
    'SELECT COUNT(DISTINCT user_id) as count FROM daily_records WHERE date = ?'
  ).get(todayDate);

  res.json({
    totalKeys: totalKeys.count,
    activatedKeys: activatedKeys.count,
    unusedKeys: unusedKeys.count,
    totalUsers: totalUsers.count,
    activeToday: activeToday.count,
  });
});

export default router;
