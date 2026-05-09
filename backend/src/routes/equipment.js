import { Router } from 'express';
import db from '../database.js';

const router = Router();

// ציוד — רשימה עם סטטיסטיקות
router.get('/', (req, res) => {
  const equipment = db.prepare(`
    SELECT e.*,
      (SELECT COUNT(*) FROM equipment_loans WHERE equipment_id = e.id AND status = 'active') as active_loans,
      (SELECT COUNT(*) FROM equipment_repairs WHERE equipment_id = e.id AND back_in_service = 0) as open_repairs,
      CAST(julianday(e.next_inspection) - julianday('now') AS INTEGER) as days_to_inspection
    FROM equipment e ORDER BY e.type, e.name
  `).all();
  res.json(equipment);
});

// ציוד — פרופיל מלא
router.get('/:id', (req, res) => {
  const item = db.prepare(`
    SELECT e.*,
      CAST(julianday(e.next_inspection) - julianday('now') AS INTEGER) as days_to_inspection
    FROM equipment e WHERE e.id = ?
  `).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'לא נמצא' });

  const inspections = db.prepare(`SELECT * FROM equipment_inspections WHERE equipment_id = ? ORDER BY inspection_date DESC`).all(req.params.id);
  const repairs = db.prepare(`SELECT * FROM equipment_repairs WHERE equipment_id = ? ORDER BY report_date DESC`).all(req.params.id);
  const loans = db.prepare(`SELECT * FROM equipment_loans WHERE equipment_id = ? ORDER BY loan_date DESC`).all(req.params.id);
  const images = db.prepare(`SELECT * FROM equipment_images WHERE equipment_id = ? ORDER BY uploaded_at DESC`).all(req.params.id);
  const forecasts = db.prepare(`SELECT * FROM maintenance_forecasts WHERE equipment_id = ? AND status = 'pending' ORDER BY predicted_date`).all(req.params.id);

  const totalRepairCost = repairs.reduce((s, r) => s + (r.cost || 0), 0);
  const totalInspectionCost = inspections.reduce((s, i) => s + (i.cost || 0), 0);
  const totalCost = (item.purchase_price || 0) + totalRepairCost + totalInspectionCost;
  const costPerFlight = item.total_flights > 0 ? (totalCost / item.total_flights).toFixed(2) : null;

  res.json({ ...item, inspections, repairs, loans, images, forecasts, stats: { totalRepairCost, totalInspectionCost, totalCost, costPerFlight } });
});

// הוספת ציוד
router.post('/', (req, res) => {
  const {
    name, type, brand, model, serial_number, manufacture_year, color, size, weight_kg,
    min_pilot_weight, max_pilot_weight, purchase_date, purchase_price, supplier_id,
    warranty_expiry, owner_type, owner_id, owner_name, condition, location,
    max_flights, max_years, insured, insurance_value, insurance_expiry,
    inspection_interval_months, next_inspection, notes
  } = req.body;

  const result = db.prepare(`
    INSERT INTO equipment (
      name, type, brand, model, serial_number, manufacture_year, color, size, weight_kg,
      min_pilot_weight, max_pilot_weight, purchase_date, purchase_price, supplier_id,
      warranty_expiry, owner_type, owner_id, owner_name, condition, location,
      max_flights, max_years, insured, insurance_value, insurance_expiry,
      inspection_interval_months, next_inspection, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    name, type, brand, model, serial_number, manufacture_year, color, size, weight_kg,
    min_pilot_weight, max_pilot_weight, purchase_date, purchase_price, supplier_id,
    warranty_expiry, owner_type || 'club', owner_id, owner_name, condition || 'good', location || 'מחסן',
    max_flights, max_years, insured ? 1 : 0, insurance_value, insurance_expiry,
    inspection_interval_months || 12, next_inspection, notes
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

// עדכון ציוד
router.put('/:id', (req, res) => {
  const {
    name, type, brand, model, serial_number, manufacture_year, color, size,
    min_pilot_weight, max_pilot_weight, status, condition, location,
    total_flights, total_hours, max_flights, max_years,
    insured, insurance_value, insurance_expiry,
    warranty_expiry, next_inspection, inspection_interval_months, notes
  } = req.body;

  db.prepare(`
    UPDATE equipment SET
      name=?, type=?, brand=?, model=?, serial_number=?, manufacture_year=?, color=?, size=?,
      min_pilot_weight=?, max_pilot_weight=?, status=?, condition=?, location=?,
      total_flights=?, total_hours=?, max_flights=?, max_years=?,
      insured=?, insurance_value=?, insurance_expiry=?,
      warranty_expiry=?, next_inspection=?, inspection_interval_months=?, notes=?
    WHERE id=?
  `).run(
    name, type, brand, model, serial_number, manufacture_year, color, size,
    min_pilot_weight, max_pilot_weight, status, condition, location,
    total_flights, total_hours, max_flights, max_years,
    insured ? 1 : 0, insurance_value, insurance_expiry,
    warranty_expiry, next_inspection, inspection_interval_months, notes,
    req.params.id
  );
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM equipment WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// בדיקות
router.get('/:id/inspections', (req, res) => {
  const inspections = db.prepare(`SELECT * FROM equipment_inspections WHERE equipment_id = ? ORDER BY inspection_date DESC`).all(req.params.id);
  res.json(inspections);
});

router.post('/:id/inspections', (req, res) => {
  const { inspection_date, inspection_type, result, findings, inspector, lab_name, cost, certificate_url } = req.body;

  const interval = db.prepare(`SELECT inspection_interval_months FROM equipment WHERE id = ?`).get(req.params.id)?.inspection_interval_months || 12;
  const nextDate = new Date(inspection_date);
  nextDate.setMonth(nextDate.getMonth() + interval);
  const next_due = nextDate.toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO equipment_inspections (equipment_id, inspection_date, inspection_type, result, findings, inspector, lab_name, cost, certificate_url, next_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, inspection_date, inspection_type, result, findings, inspector, lab_name, cost, certificate_url, next_due);

  db.prepare(`UPDATE equipment SET last_inspection=?, next_inspection=? WHERE id=?`).run(inspection_date, next_due, req.params.id);

  res.status(201).json({ success: true, next_due });
});

// תיקונים
router.get('/:id/repairs', (req, res) => {
  const repairs = db.prepare(`SELECT * FROM equipment_repairs WHERE equipment_id = ? ORDER BY report_date DESC`).all(req.params.id);
  res.json(repairs);
});

router.post('/:id/repairs', (req, res) => {
  const { description, reported_by, repaired_by, repair_date, cost, under_warranty, result, back_in_service, notes } = req.body;

  const insertResult = db.prepare(`
    INSERT INTO equipment_repairs (equipment_id, description, reported_by, repaired_by, repair_date, cost, under_warranty, result, back_in_service, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, description, reported_by, repaired_by, repair_date, cost, under_warranty ? 1 : 0, result, back_in_service ? 1 : 0, notes);

  if (!back_in_service) {
    db.prepare(`UPDATE equipment SET status = 'repair' WHERE id = ?`).run(req.params.id);
  } else {
    db.prepare(`UPDATE equipment SET status = 'active' WHERE id = ?`).run(req.params.id);
  }

  res.status(201).json({ id: insertResult.lastInsertRowid });
});

router.put('/repairs/:id', (req, res) => {
  const { repaired_by, repair_date, cost, result, back_in_service, notes } = req.body;
  const repair = db.prepare(`SELECT * FROM equipment_repairs WHERE id = ?`).get(req.params.id);
  if (!repair) return res.status(404).json({ error: 'לא נמצא' });

  db.prepare(`
    UPDATE equipment_repairs SET repaired_by=?, repair_date=?, cost=?, result=?, back_in_service=?, notes=?
    WHERE id=?
  `).run(repaired_by, repair_date, cost, result, back_in_service ? 1 : 0, notes, req.params.id);

  if (back_in_service) {
    db.prepare(`UPDATE equipment SET status = 'active' WHERE id = ?`).run(repair.equipment_id);
  }

  res.json({ success: true });
});

// השאלות
router.get('/:id/loans', (req, res) => {
  const loans = db.prepare(`SELECT * FROM equipment_loans WHERE equipment_id = ? ORDER BY loan_date DESC`).all(req.params.id);
  res.json(loans);
});

router.post('/:id/loans', (req, res) => {
  const { borrower_type, borrower_id, borrower_name, borrower_phone, expected_return, condition_out, approved_by, notes } = req.body;

  const active = db.prepare(`SELECT id FROM equipment_loans WHERE equipment_id = ? AND status = 'active'`).get(req.params.id);
  if (active) return res.status(400).json({ error: 'הציוד כבר מושאל' });

  const result = db.prepare(`
    INSERT INTO equipment_loans (equipment_id, borrower_type, borrower_id, borrower_name, borrower_phone, expected_return, condition_out, approved_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, borrower_type, borrower_id, borrower_name, borrower_phone, expected_return, condition_out || 'good', approved_by, notes);

  db.prepare(`UPDATE equipment SET status = 'loaned', location = ? WHERE id = ?`).run(`אצל ${borrower_name}`, req.params.id);

  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/loans/:id/return', (req, res) => {
  const { condition_in, notes } = req.body;
  const loan = db.prepare(`SELECT * FROM equipment_loans WHERE id = ?`).get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'לא נמצא' });

  db.prepare(`
    UPDATE equipment_loans SET status='returned', actual_return=date('now'), condition_in=?, notes=?
    WHERE id=?
  `).run(condition_in, notes, req.params.id);

  db.prepare(`UPDATE equipment SET status='active', location='מחסן' WHERE id=?`).run(loan.equipment_id);

  if (condition_in === 'damaged') {
    db.prepare(`UPDATE equipment SET status='repair', condition='poor' WHERE id=?`).run(loan.equipment_id);
  }

  res.json({ success: true });
});

// סטטיסטיקות
router.get('/stats/summary', (req, res) => {
  const stats = {
    total: db.prepare(`SELECT COUNT(*) as c FROM equipment`).get().c,
    active: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE status='active'`).get().c,
    loaned: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE status='loaned'`).get().c,
    in_repair: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE status='repair'`).get().c,
    overdue_inspection: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE next_inspection < date('now') AND status != 'retired'`).get().c,
    urgent_inspection: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE next_inspection BETWEEN date('now') AND date('now', '+7 days') AND status != 'retired'`).get().c,
    warning_inspection: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE next_inspection BETWEEN date('now', '+8 days') AND date('now', '+30 days') AND status != 'retired'`).get().c,
    overdue_loans: db.prepare(`SELECT COUNT(*) as c FROM equipment_loans WHERE status='active' AND expected_return < date('now')`).get().c,
    open_repairs: db.prepare(`SELECT COUNT(*) as c FROM equipment_repairs WHERE back_in_service = 0`).get().c,
    by_type: db.prepare(`SELECT type, COUNT(*) as count FROM equipment GROUP BY type`).all(),
    inspection_upcoming: db.prepare(`
      SELECT name, type, owner_name, next_inspection,
      CAST(julianday(next_inspection) - julianday('now') AS INTEGER) as days_left
      FROM equipment
      WHERE next_inspection <= date('now', '+30 days') AND status != 'retired'
      ORDER BY next_inspection LIMIT 10
    `).all()
  };
  res.json(stats);
});

export default router;
