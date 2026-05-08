import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const equipment = db.prepare(`SELECT * FROM equipment ORDER BY type, name`).all();
  res.json(equipment);
});

router.get('/:id', (req, res) => {
  const item = db.prepare(`SELECT * FROM equipment WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'לא נמצא' });
  const history = db.prepare(`SELECT * FROM equipment_history WHERE equipment_id = ? ORDER BY date DESC LIMIT 20`).all(req.params.id);
  const maintenance = db.prepare(`SELECT * FROM maintenance_records WHERE equipment_id = ? ORDER BY performed_date DESC`).all(req.params.id);
  const forecasts = db.prepare(`SELECT * FROM maintenance_forecasts WHERE equipment_id = ? ORDER BY predicted_date`).all(req.params.id);
  res.json({ ...item, history, maintenance, forecasts });
});

router.post('/', (req, res) => {
  const { name, type, brand, model, serial_number, purchase_date, purchase_price, owner_type, owner_id, owner_name, condition, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO equipment (name, type, brand, model, serial_number, purchase_date, purchase_price, owner_type, owner_id, owner_name, condition, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type, brand, model, serial_number, purchase_date, purchase_price, owner_type || 'club', owner_id, owner_name, condition || 'good', notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, type, brand, model, serial_number, status, condition, total_flights, total_hours, last_inspection, next_inspection, notes } = req.body;
  db.prepare(`
    UPDATE equipment SET name=?, type=?, brand=?, model=?, serial_number=?, status=?, condition=?, total_flights=?, total_hours=?, last_inspection=?, next_inspection=?, notes=?
    WHERE id=?
  `).run(name, type, brand, model, serial_number, status, condition, total_flights, total_hours, last_inspection, next_inspection, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM equipment WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/history', (req, res) => {
  const { event_type, description, date, performed_by, cost } = req.body;
  const result = db.prepare(`
    INSERT INTO equipment_history (equipment_id, event_type, description, date, performed_by, cost)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, event_type, description, date || new Date().toISOString().split('T')[0], performed_by, cost);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/:id/maintenance', (req, res) => {
  const { type, description, performed_date, next_due, cost, technician, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO maintenance_records (equipment_id, type, description, performed_date, next_due, cost, technician, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, type, description, performed_date, next_due, cost, technician, notes);
  if (performed_date) {
    db.prepare(`UPDATE equipment SET last_inspection=? WHERE id=?`).run(performed_date, req.params.id);
  }
  if (next_due) {
    db.prepare(`UPDATE equipment SET next_inspection=? WHERE id=?`).run(next_due, req.params.id);
  }
  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
