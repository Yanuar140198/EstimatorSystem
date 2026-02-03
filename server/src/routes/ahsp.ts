import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { calculateAhspTotals } from '../utils/ahsp.js';
import { logAudit } from '../services/audit.js';

const router = Router();

const lineSchema = z.object({
  type: z.enum(['material', 'labor', 'equipment']),
  refCode: z.string().nullable(),
  name: z.string(),
  unit: z.string(),
  coefficient: z.number(),
  unitPrice: z.number()
});

const ahspSchema = z.object({
  overheadPct: z.number(),
  profitPct: z.number(),
  lines: z.array(lineSchema)
});

const copySchema = z.object({
  targetWbsIds: z.array(z.number().min(1)),
  overheadPct: z.number(),
  profitPct: z.number()
});

router.get('/wbs/:id/ahsp', requireAuth, async (req, res) => {
  const wbsId = Number(req.params.id);
  const headers = await query(
    'SELECT id, wbs_item_id as wbsItemId, direct_cost as directCost, unit_rate as unitRate, computed_at as computedAt FROM ahsp_headers WHERE wbs_item_id = :wbsId',
    { wbsId }
  );
  const header = headers[0];
  const lines = header
    ? await query(
        `SELECT id, ahsp_id as ahspId, type, ref_code as refCode, name, unit, coefficient, unit_price as unitPrice, subtotal
         FROM ahsp_lines WHERE ahsp_id = :ahspId`,
        { ahspId: header.id }
      )
    : [];
  return res.json({ header, lines });
});

router.post('/wbs/:id/ahsp', requireAuth, async (req: AuthRequest, res) => {
  const wbsId = Number(req.params.id);
  const result = ahspSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const payload = result.data;
  const totals = calculateAhspTotals({
    lines: payload.lines.map((line) => ({
      type: line.type,
      coefficient: line.coefficient,
      unitPrice: line.unitPrice
    })),
    overheadPct: payload.overheadPct,
    profitPct: payload.profitPct
  });

  const existing = await query<{ id: number }>('SELECT id FROM ahsp_headers WHERE wbs_item_id = :wbsId', { wbsId });
  let ahspId = existing[0]?.id;

  if (!ahspId) {
    const response = await query<{ insertId: number }>(
      `INSERT INTO ahsp_headers (wbs_item_id, direct_cost, unit_rate, computed_at)
       VALUES (:wbsItemId, :directCost, :unitRate, NOW())`,
      { wbsItemId: wbsId, directCost: totals.directCost, unitRate: totals.unitRate }
    );
    ahspId = (response as unknown as { insertId: number }).insertId;
  } else {
    await query(
      `UPDATE ahsp_headers
       SET direct_cost = :directCost, unit_rate = :unitRate, computed_at = NOW()
       WHERE id = :id`,
      { id: ahspId, directCost: totals.directCost, unitRate: totals.unitRate }
    );
    await query('DELETE FROM ahsp_lines WHERE ahsp_id = :id', { id: ahspId });
  }

  for (const line of payload.lines) {
    const subtotal = line.coefficient * line.unitPrice;
    await query(
      `INSERT INTO ahsp_lines (ahsp_id, type, ref_code, name, unit, coefficient, unit_price, subtotal)
       VALUES (:ahspId, :type, :refCode, :name, :unit, :coefficient, :unitPrice, :subtotal)`,
      {
        ahspId,
        type: line.type,
        refCode: line.refCode,
        name: line.name,
        unit: line.unit,
        coefficient: line.coefficient,
        unitPrice: line.unitPrice,
        subtotal
      }
    );
  }

  await logAudit(req.user?.id ?? null, 'ahsp_headers', ahspId, 'upsert', undefined, payload);
  return res.json({ ahspId, totals });
});

router.post('/wbs/:id/ahsp/copy', requireAuth, async (req: AuthRequest, res) => {
  const sourceWbsId = Number(req.params.id);
  const result = copySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const header = await query<{ id: number }>('SELECT id FROM ahsp_headers WHERE wbs_item_id = :id', { id: sourceWbsId });
  if (!header[0]) {
    return res.status(404).json({ message: 'Source AHSP not found' });
  }
  const lines = await query(
    `SELECT type, ref_code as refCode, name, unit, coefficient, unit_price as unitPrice
     FROM ahsp_lines WHERE ahsp_id = :ahspId`,
    { ahspId: header[0].id }
  );

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const targetId of result.data.targetWbsIds) {
      const totals = calculateAhspTotals({
        lines: lines.map((line) => ({
          type: line.type,
          coefficient: Number(line.coefficient),
          unitPrice: Number(line.unitPrice)
        })),
        overheadPct: result.data.overheadPct,
        profitPct: result.data.profitPct
      });
      const existing = await connection.execute<{ id: number }[]>(
        'SELECT id FROM ahsp_headers WHERE wbs_item_id = ?',
        [targetId]
      );
      const existingRows = existing[0] as { id: number }[];
      let ahspId = existingRows[0]?.id;
      if (!ahspId) {
        const insertResult = await connection.execute<{ insertId: number }>(
          `INSERT INTO ahsp_headers (wbs_item_id, direct_cost, unit_rate, computed_at)
           VALUES (?, ?, ?, NOW())`,
          [targetId, totals.directCost, totals.unitRate]
        );
        ahspId = (insertResult[0] as { insertId: number }).insertId;
      } else {
        await connection.execute(
          `UPDATE ahsp_headers SET direct_cost = ?, unit_rate = ?, computed_at = NOW() WHERE id = ?`,
          [totals.directCost, totals.unitRate, ahspId]
        );
        await connection.execute('DELETE FROM ahsp_lines WHERE ahsp_id = ?', [ahspId]);
      }
      for (const line of lines as Array<Record<string, unknown>>) {
        const coefficient = Number(line.coefficient);
        const unitPrice = Number(line.unitPrice);
        const subtotal = coefficient * unitPrice;
        await connection.execute(
          `INSERT INTO ahsp_lines (ahsp_id, type, ref_code, name, unit, coefficient, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ahspId, line.type, line.refCode, line.name, line.unit, coefficient, unitPrice, subtotal]
        );
      }
      await logAudit(req.user?.id ?? null, 'ahsp_headers', ahspId, 'copy', undefined, {
        sourceWbsId,
        targetWbsId: targetId
      });
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Copy AHSP failed' });
  } finally {
    connection.release();
  }
  return res.json({ message: 'AHSP copied', count: result.data.targetWbsIds.length });
});

export default router;
