import { query } from '../db.js';

export async function writeAuditLog({
  actorType = 'admin',
  actorSessionId = null,
  action,
  targetType,
  targetId = null,
  details = null,
}) {
  await query(
    `
      INSERT INTO audit_logs (actor_type, actor_session_id, action, target_type, target_id, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [actorType, actorSessionId, action, targetType, targetId, details ? JSON.stringify(details) : null]
  );
}
