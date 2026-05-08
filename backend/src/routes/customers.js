import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const customers = db.prepare(`SELECT * FROM customers ORDER BY name`).all();
  res.json(customers);
});

router.get('/:id', (req, res) => {
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'לא נמצא' });
  const interactions = db.prepare(`SELECT * FROM customer_interactions WHERE customer_id = ? ORDER BY date DESC`).all(req.params.id);
  res.json({ ...customer, interactions });
});

router.post('/', (req, res) => {
  const { name, phone, email, birth_date, membership_type, membership_expiry, certifications, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO customers (name, phone, email, birth_date, membership_type, membership_expiry, certifications, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, email, birth_date, membership_type || 'regular', membership_expiry, certifications, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, phone, email, birth_date, membership_type, membership_expiry, certifications, status, notes, total_flights } = req.body;
  db.prepare(`
    UPDATE customers SET name=?, phone=?, email=?, birth_date=?, membership_type=?, membership_expiry=?, certifications=?, status=?, notes=?, total_flights=?
    WHERE id=?
  `).run(name, phone, email, birth_date, membership_type, membership_expiry, certifications, status, notes, total_flights, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM customers WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/interactions', (req, res) => {
  const { type, description, date, staff } = req.body;
  const result = db.prepare(`
    INSERT INTO customer_interactions (customer_id, type, description, date, staff)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, type, description, date || new Date().toISOString().split('T')[0], staff);
  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
