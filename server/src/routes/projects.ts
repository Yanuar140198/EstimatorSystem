import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(2),
  location: z.string().default('Mining Konawe'),
  ohPct: z.number().min(0),
  profitPct: z.number().min(0),
  contingencyPct: z.number().min(0),
  ppnPct: z.number().min(0),
  fuelEscalationPct: z.number().min(0)
});

router.get('/', requireAuth, async (_req, res) => {
  const projects = await query(
    `SELECT id, name, location, oh_pct as ohPct, profit_pct as profitPct, contingency_pct as contingencyPct,
        ppn_pct as ppnPct, fuel_escalation_pct as fuelEscalationPct, created_at as createdAt
     FROM projects
     ORDER BY created_at DESC`
  );
  return res.json(projects);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const payload = result.data;
  const response = await query<{ insertId: number }>(
    `INSERT INTO projects
      (name, location, oh_pct, profit_pct, contingency_pct, ppn_pct, fuel_escalation_pct, created_by, created_at)
     VALUES (:name, :location, :ohPct, :profitPct, :contingencyPct, :ppnPct, :fuelEscalationPct, :createdBy, NOW())`,
    {
      name: payload.name,
      location: payload.location,
      ohPct: payload.ohPct,
      profitPct: payload.profitPct,
      contingencyPct: payload.contingencyPct,
      ppnPct: payload.ppnPct,
      fuelEscalationPct: payload.fuelEscalationPct,
      createdBy: req.user?.id ?? null
    }
  );
  const insertId = (response as unknown as { insertId: number }).insertId;
  await logAudit(req.user?.id ?? null, 'projects', insertId, 'create', undefined, payload);
  return res.status(201).json({ id: insertId, ...payload });
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const projectId = Number(req.params.id);
  const existing = await query<Record<string, unknown>>('SELECT * FROM projects WHERE id = :id', { id: projectId });
  if (!existing[0]) {
    return res.status(404).json({ message: 'Project not found' });
  }
  const payload = result.data;
  await query(
    `UPDATE projects
     SET name = :name, location = :location, oh_pct = :ohPct, profit_pct = :profitPct,
         contingency_pct = :contingencyPct, ppn_pct = :ppnPct, fuel_escalation_pct = :fuelEscalationPct
     WHERE id = :id`,
    { id: projectId, ...payload }
  );
  await logAudit(req.user?.id ?? null, 'projects', projectId, 'update', existing[0] as Record<string, unknown>, payload);
  return res.json({ id: projectId, ...payload });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const projectId = Number(req.params.id);
  const existing = await query<Record<string, unknown>>('SELECT * FROM projects WHERE id = :id', { id: projectId });
  if (!existing[0]) {
    return res.status(404).json({ message: 'Project not found' });
  }
  await query('DELETE FROM projects WHERE id = :id', { id: projectId });
  await logAudit(req.user?.id ?? null, 'projects', projectId, 'delete', existing[0] as Record<string, unknown>);
  return res.status(204).send();
});

export default router;
