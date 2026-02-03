import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';

const router = Router();

const masterSchema = z.object({
  code: z.string(),
  name: z.string(),
  unit: z.string(),
  price: z.number(),
  source: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

const tableMap: Record<string, { table: string; extra: string[] }> = {
  materials: { table: 'materials_master', extra: ['source'] },
  labor: { table: 'labor_master', extra: ['region'] },
  equipment: { table: 'equipment_master', extra: ['notes'] }
};

router.get('/masters/:type', requireAuth, async (req, res) => {
  const { type } = req.params;
  const config = tableMap[type];
  if (!config) {
    return res.status(404).json({ message: 'Unknown master type' });
  }
  const items = await query(`SELECT * FROM ${config.table} ORDER BY updated_at DESC`);
  return res.json(items);
});

router.post('/masters/:type', requireAuth, async (req: AuthRequest, res) => {
  const { type } = req.params;
  const config = tableMap[type];
  if (!config) {
    return res.status(404).json({ message: 'Unknown master type' });
  }
  const result = masterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const payload = result.data;
  const response = await query<{ insertId: number }>(
    `INSERT INTO ${config.table} (code, name, unit, price, source, region, notes, updated_at)
     VALUES (:code, :name, :unit, :price, :source, :region, :notes, NOW())`,
    {
      code: payload.code,
      name: payload.name,
      unit: payload.unit,
      price: payload.price,
      source: payload.source ?? null,
      region: payload.region ?? null,
      notes: payload.notes ?? null
    }
  );
  const insertId = (response as unknown as { insertId: number }).insertId;
  await logAudit(req.user?.id ?? null, config.table, insertId, 'create', undefined, payload);
  return res.status(201).json({ id: insertId, ...payload });
});

router.put('/masters/:type/:id', requireAuth, async (req: AuthRequest, res) => {
  const { type } = req.params;
  const config = tableMap[type];
  if (!config) {
    return res.status(404).json({ message: 'Unknown master type' });
  }
  const result = masterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const masterId = Number(req.params.id);
  const existing = await query<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = :id`, { id: masterId });
  if (!existing[0]) {
    return res.status(404).json({ message: 'Master item not found' });
  }
  const payload = result.data;
  await query(
    `UPDATE ${config.table}
     SET code = :code, name = :name, unit = :unit, price = :price, source = :source, region = :region, notes = :notes,
         updated_at = NOW()
     WHERE id = :id`,
    {
      id: masterId,
      code: payload.code,
      name: payload.name,
      unit: payload.unit,
      price: payload.price,
      source: payload.source ?? null,
      region: payload.region ?? null,
      notes: payload.notes ?? null
    }
  );
  await logAudit(req.user?.id ?? null, config.table, masterId, 'update', existing[0] as Record<string, unknown>, payload);
  return res.json({ id: masterId, ...payload });
});

router.delete('/masters/:type/:id', requireAuth, async (req: AuthRequest, res) => {
  const { type } = req.params;
  const config = tableMap[type];
  if (!config) {
    return res.status(404).json({ message: 'Unknown master type' });
  }
  const masterId = Number(req.params.id);
  const existing = await query<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = :id`, { id: masterId });
  if (!existing[0]) {
    return res.status(404).json({ message: 'Master item not found' });
  }
  await query(`DELETE FROM ${config.table} WHERE id = :id`, { id: masterId });
  await logAudit(req.user?.id ?? null, config.table, masterId, 'delete', existing[0] as Record<string, unknown>);
  return res.status(204).send();
});

export default router;
