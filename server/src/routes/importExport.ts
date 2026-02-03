import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { parse } from 'csv-parse/sync';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const upload = multer();

router.post('/import/wbs', requireAuth, upload.single('file'), async (req, res) => {
  const projectId = Number(req.body.projectId);
  if (!projectId || !req.file) {
    return res.status(400).json({ message: 'projectId and file are required' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const rows: Array<Record<string, string>> = [];

    if (req.file.originalname.endsWith('.csv')) {
      const csv = req.file.buffer.toString('utf-8');
      const records = parse(csv, { columns: true, skip_empty_lines: true });
      rows.push(...records);
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        rows.push({
          'WBS Code': String(row.getCell(1).value ?? ''),
          Level: String(row.getCell(2).value ?? ''),
          'Paket Pekerjaan': String(row.getCell(3).value ?? ''),
          Quantity: String(row.getCell(4).value ?? ''),
          Unit: String(row.getCell(5).value ?? ''),
          Remarks: String(row.getCell(6).value ?? '')
        });
      });
    }

    const insertSql = `INSERT INTO wbs_items
      (project_id, wbs_code, level, parent_id, name, unit, quantity, remarks, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    let order = 0;
    for (const row of rows) {
      order += 1;
      const wbsCode = row['WBS Code'];
      const level = Number(row.Level || 1);
      const name = row['Paket Pekerjaan'];
      const quantity = Number(row.Quantity || 0);
      const unit = row.Unit || 'unit';
      const remarks = row.Remarks || null;
      await connection.execute(insertSql, [projectId, wbsCode, level, null, name, unit, quantity, remarks, order]);
    }

    await connection.commit();
    return res.json({ message: 'WBS imported', count: rows.length });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Import failed' });
  } finally {
    connection.release();
  }
});

router.get('/export/boq.xlsx', requireAuth, async (req, res) => {
  const projectId = Number(req.query.projectId);
  const items = await query(
    `SELECT id, wbs_code as wbsCode, name, unit, quantity, level, parent_id as parentId,
        (SELECT unit_rate FROM ahsp_headers WHERE wbs_item_id = wbs_items.id) as unitRate
     FROM wbs_items WHERE project_id = :projectId ORDER BY sort_order ASC`,
    { projectId }
  );
  const childrenMap = new Map<number, number[]>();
  const itemMap = new Map<number, typeof items[number]>();
  items.forEach((item) => {
    itemMap.set(item.id, item);
    if (item.parentId) {
      const list = childrenMap.get(item.parentId) ?? [];
      list.push(item.id);
      childrenMap.set(item.parentId, list);
    }
  });

  const totalMap = new Map<number, number>();
  const computeTotal = (id: number): number => {
    if (totalMap.has(id)) return totalMap.get(id)!;
    const item = itemMap.get(id);
    if (!item) return 0;
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) {
      const total = Number(item.quantity ?? 0) * Number(item.unitRate ?? 0);
      totalMap.set(id, total);
      return total;
    }
    const total = children.reduce((sum, childId) => sum + computeTotal(childId), 0);
    totalMap.set(id, total);
    return total;
  };
  items.forEach((item) => computeTotal(item.id));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('BOQ');
  sheet.addRow(['WBS Code', 'Uraian', 'Unit', 'Quantity', 'Unit Rate', 'Total', 'Subtotal Level-1']);
  items.forEach((item) => {
    const total = Number(item.quantity ?? 0) * Number(item.unitRate ?? 0);
    const subtotal = item.level === 1 ? totalMap.get(item.id) ?? 0 : '';
    sheet.addRow([item.wbsCode, item.name, item.unit, item.quantity, item.unitRate ?? 0, total, subtotal]);
  });
  sheet.columns.forEach((column, index) => {
    if (index >= 3) {
      column.numFmt = '#,##0.00';
    }
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="boq.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

router.get('/export/ahsp.xlsx', requireAuth, async (req, res) => {
  const projectId = Number(req.query.projectId);
  const [project] = await query(
    `SELECT name, location, oh_pct as ohPct, profit_pct as profitPct, contingency_pct as contingencyPct, ppn_pct as ppnPct
     FROM projects WHERE id = :projectId`,
    { projectId }
  );
  const items = await query(
    `SELECT id, wbs_code as wbsCode, name, unit, quantity, level, parent_id as parentId
     FROM wbs_items WHERE project_id = :projectId ORDER BY sort_order ASC`,
    { projectId }
  );
  const childMap = new Map<number, number[]>();
  const itemMap = new Map<number, typeof items[number]>();
  items.forEach((item) => {
    itemMap.set(item.id, item);
    if (item.parentId) {
      const list = childMap.get(item.parentId) ?? [];
      list.push(item.id);
      childMap.set(item.parentId, list);
    }
  });
  const leafItems = items.filter((item) => !(childMap.get(item.id)?.length));
  const workbook = new ExcelJS.Workbook();
  const boqSheet = workbook.addWorksheet('BOQ');
  boqSheet.addRow(['WBS Code', 'Uraian', 'Unit', 'Quantity', 'Unit Rate', 'Total', 'Subtotal Level-1']);
  boqSheet.views = [{ state: 'frozen', ySplit: 1 }];

  const totalMap = new Map<number, number>();
  const computeTotal = async (id: number): Promise<number> => {
    if (totalMap.has(id)) return totalMap.get(id)!;
    const item = itemMap.get(id);
    if (!item) return 0;
    const children = childMap.get(id) ?? [];
    if (children.length === 0) {
      const [header] = await query<{ unitRate: number }>(
        'SELECT unit_rate as unitRate FROM ahsp_headers WHERE wbs_item_id = :id',
        { id: item.id }
      );
      const total = Number(item.quantity ?? 0) * Number(header?.unitRate ?? 0);
      totalMap.set(id, total);
      return total;
    }
    const total = (await Promise.all(children.map((childId) => computeTotal(childId)))).reduce((sum, value) => sum + value, 0);
    totalMap.set(id, total);
    return total;
  };

  for (const item of items as Array<typeof items[number]>) {
    const [header] = await query<{ unitRate: number }>(
      'SELECT unit_rate as unitRate FROM ahsp_headers WHERE wbs_item_id = :id',
      { id: item.id }
    );
    const total = Number(item.quantity ?? 0) * Number(header?.unitRate ?? 0);
    const subtotal = item.level === 1 ? await computeTotal(item.id) : '';
    boqSheet.addRow([item.wbsCode, item.name, item.unit, item.quantity, header?.unitRate ?? 0, total, subtotal]);
  }
  boqSheet.columns.forEach((column, index) => {
    if (index >= 3) {
      column.numFmt = '#,##0.00';
    }
  });

  const indexSheet = workbook.addWorksheet('AHSP_INDEX');
  indexSheet.addRow(['WBS Code', 'Uraian', 'Unit', 'Quantity', 'Sheet']);
  indexSheet.views = [{ state: 'frozen', ySplit: 1 }];

  const sanitizeSheetName = (name: string) => name.replace(/[\\/?*:[\]]/g, '-').substring(0, 28);
  const sheetNames = new Map<number, string>();
  leafItems.forEach((item, index) => {
    const base = sanitizeSheetName(item.wbsCode);
    const name = workbook.getWorksheet(base) ? `${base}-${index + 1}` : base;
    sheetNames.set(item.id, name);
  });

  leafItems.forEach((item) => {
    const sheetName = sheetNames.get(item.id) ?? sanitizeSheetName(item.wbsCode);
    const hyperlink = `#'${sheetName}'!A1`;
    const row = indexSheet.addRow([item.wbsCode, item.name, item.unit, item.quantity, 'Open']);
    row.getCell(5).value = { text: 'Open', hyperlink };
  });

  for (const item of leafItems as Array<typeof items[number]>) {
    const sheetName = sheetNames.get(item.id) ?? sanitizeSheetName(item.wbsCode);
    const sheet = workbook.addWorksheet(sheetName);
    sheet.addRow(['Project', project?.name ?? '-']);
    sheet.addRow(['Location', project?.location ?? '-']);
    sheet.addRow(['WBS', `${item.wbsCode} - ${item.name}`]);
    sheet.addRow(['OH %', project?.ohPct ?? 0, 'Profit %', project?.profitPct ?? 0]);
    sheet.addRow(['PPN %', project?.ppnPct ?? 0, 'Contingency %', project?.contingencyPct ?? 0]);
    sheet.addRow([]);

    const [header] = await query<{ id: number }>('SELECT id FROM ahsp_headers WHERE wbs_item_id = :id', { id: item.id });
    const lines = header
      ? await query(
          `SELECT type, ref_code as refCode, name, unit, coefficient, unit_price as unitPrice, subtotal
           FROM ahsp_lines WHERE ahsp_id = :ahspId`,
          { ahspId: header.id }
        )
      : [];

    const addSection = (title: string, type: string) => {
      sheet.addRow([title]);
      sheet.addRow(['Code', 'Name', 'Unit', 'Coefficient', 'Unit Price', 'Subtotal']);
      const sectionLines = lines.filter((line) => line.type === type);
      if (sectionLines.length === 0) {
        sheet.addRow(['-', '-', '-', 0, 0, 0]);
      } else {
        sectionLines.forEach((line) => {
          sheet.addRow([line.refCode ?? '', line.name, line.unit, line.coefficient, line.unitPrice, line.subtotal]);
        });
      }
      sheet.addRow([]);
    };

    addSection('Materials', 'material');
    addSection('Labor', 'labor');
    addSection('Equipment', 'equipment');

    const directCost = lines.reduce((sum, line) => sum + Number(line.subtotal ?? 0), 0);
    const markupRate = ((project?.ohPct ?? 0) + (project?.profitPct ?? 0)) / 100;
    const markup = directCost * markupRate;
    const unitRate = directCost + markup;
    const lineTotal = unitRate * Number(item.quantity ?? 0);
    const contingency = lineTotal * ((project?.contingencyPct ?? 0) / 100);
    const subtotalWithContingency = lineTotal + contingency;
    const ppn = subtotalWithContingency * ((project?.ppnPct ?? 0) / 100);
    const grandTotal = subtotalWithContingency + ppn;

    sheet.addRow(['Recap']);
    sheet.addRow(['Direct Cost', directCost]);
    sheet.addRow(['Markup (OH+Profit)', markup]);
    sheet.addRow(['Unit Rate', unitRate]);
    sheet.addRow(['Quantity', item.quantity]);
    sheet.addRow(['Line Total', lineTotal]);
    sheet.addRow(['Contingency', contingency]);
    sheet.addRow(['PPN', ppn]);
    sheet.addRow(['Grand Total', grandTotal]);

    sheet.getColumn(2).numFmt = '#,##0.00';
    sheet.getColumn(4).numFmt = '#,##0.0000';
    sheet.getColumn(5).numFmt = '#,##0.00';
    sheet.getColumn(6).numFmt = '#,##0.00';
    sheet.views = [{ state: 'frozen', ySplit: 6 }];
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="ahsp.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

router.get('/export/report.pdf', requireAuth, async (req, res) => {
  const projectId = Number(req.query.projectId);
  const items = await query(
    `SELECT wbs_code as wbsCode, name, unit, quantity,
        (SELECT unit_rate FROM ahsp_headers WHERE wbs_item_id = wbs_items.id) as unitRate
     FROM wbs_items WHERE project_id = :projectId ORDER BY sort_order ASC`,
    { projectId }
  );
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  doc.pipe(res);
  doc.fontSize(16).text('BOQ Summary', { underline: true });
  doc.moveDown();
  items.forEach((item) => {
    const total = Number(item.quantity ?? 0) * Number(item.unitRate ?? 0);
    doc.fontSize(10).text(`${item.wbsCode} - ${item.name} | ${item.quantity} ${item.unit} | Rp ${total.toLocaleString('id-ID')}`);
  });
  doc.end();
});

export default router;
