import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';

const router = Router();

const wbsSchema = z.object({
  wbsCode: z.string().min(1),
  level: z.number().min(1).max(5),
  parentId: z.number().nullable(),
  name: z.string().min(2),
  unit: z.string().min(1),
  quantity: z.number().min(0),
  remarks: z.string().optional().nullable(),
  sortOrder: z.number().min(0)
});

router.get('/projects/:projectId/wbs', requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const items = await query(
    `SELECT id, project_id as projectId, wbs_code as wbsCode, level, parent_id as parentId,
        name, unit, quantity, remarks, sort_order as sortOrder
     FROM wbs_items
     WHERE project_id = :projectId
     ORDER BY sort_order ASC, wbs_code ASC`,
    { projectId }
  );
  return res.json(items);
});

router.post('/projects/:projectId/wbs', requireAuth, async (req: AuthRequest, res) => {
  const projectId = Number(req.params.projectId);
  const result = wbsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const payload = result.data;
  const response = await query<{ insertId: number }>(
    `INSERT INTO wbs_items (project_id, wbs_code, level, parent_id, name, unit, quantity, remarks, sort_order)
     VALUES (:projectId, :wbsCode, :level, :parentId, :name, :unit, :quantity, :remarks, :sortOrder)`,
    { projectId, ...payload }
  );
  const insertId = (response as unknown as { insertId: number }).insertId;
  await logAudit(req.user?.id ?? null, 'wbs_items', insertId, 'create', undefined, payload);
  return res.status(201).json({ id: insertId, projectId, ...payload });
});

router.put('/wbs/:id', requireAuth, async (req: AuthRequest, res) => {
  const wbsId = Number(req.params.id);
  const result = wbsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const existing = await query<Record<string, unknown>>('SELECT * FROM wbs_items WHERE id = :id', { id: wbsId });
  if (!existing[0]) {
    return res.status(404).json({ message: 'WBS item not found' });
  }
  const payload = result.data;
  await query(
    `UPDATE wbs_items
     SET wbs_code = :wbsCode, level = :level, parent_id = :parentId, name = :name,
         unit = :unit, quantity = :quantity, remarks = :remarks, sort_order = :sortOrder
     WHERE id = :id`,
    { id: wbsId, ...payload }
  );
  await logAudit(req.user?.id ?? null, 'wbs_items', wbsId, 'update', existing[0] as Record<string, unknown>, payload);
  return res.json({ id: wbsId, ...payload });
});

router.delete('/wbs/:id', requireAuth, async (req: AuthRequest, res) => {
  const wbsId = Number(req.params.id);
  const children = await query('SELECT id FROM wbs_items WHERE parent_id = :id', { id: wbsId });
  if (children.length > 0) {
    return res.status(400).json({ message: 'Cannot delete WBS item with children' });
  }
  const existing = await query<Record<string, unknown>>('SELECT * FROM wbs_items WHERE id = :id', { id: wbsId });
  if (!existing[0]) {
    return res.status(404).json({ message: 'WBS item not found' });
  }
  await query('DELETE FROM wbs_items WHERE id = :id', { id: wbsId });
  await logAudit(req.user?.id ?? null, 'wbs_items', wbsId, 'delete', existing[0] as Record<string, unknown>);
  return res.status(204).send();
});

export default router;
