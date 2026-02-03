import { query } from '../db.js';

export async function logAudit(
  userId: number | null,
  entity: string,
  entityId: number,
  action: string,
  beforeJson?: Record<string, unknown>,
  afterJson?: Record<string, unknown>
) {
  await query(
    `INSERT INTO audit_logs (user_id, entity, entity_id, action, before_json, after_json, created_at)
     VALUES (:user_id, :entity, :entity_id, :action, :before_json, :after_json, NOW())`,
    {
      user_id: userId,
      entity,
      entity_id: entityId,
      action,
      before_json: beforeJson ? JSON.stringify(beforeJson) : null,
      after_json: afterJson ? JSON.stringify(afterJson) : null
    }
  );
}
