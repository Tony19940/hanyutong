import db from '../db.js';

export function writeAuditLog({
  actorType = 'admin',
  actorSessionId = null,
  action,
  targetType,
  targetId = null,
  details = null,
}) {
  db.prepare(`
    INSERT INTO audit_logs (actor_type, actor_session_id, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(actorType, actorSessionId, action, targetType, targetId, details ? JSON.stringify(details) : null);
}
