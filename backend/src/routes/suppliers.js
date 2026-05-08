import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const suppliers = db.prepare(`SELECT * FROM suppliers ORDER BY name`).all();
  res.json(suppliers);
});

router.get('/:id', (req, res) => {
  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'לא נמצא' });
  const orders = db.prepare(`SELECT * FROM supplier_orders WHERE supplier_id = ? ORDER BY order_date DESC`).all(req.params.id);
  res.json({ ...supplier, orders });
});

router.post('/', (req, res) => {
  const { name, contact_name, phone, email, website, category, country, rating, payment_terms, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO suppliers (name, contact_name, phone, email, website, category, country, rating, payment_terms, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, contact_name, phone, email, website, category, country, rating || 3, payment_terms, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, contact_name, phone, email, website, category, country, rating, payment_terms, notes } = req.body;
  db.prepare(`
    UPDATE suppliers SET name=?, contact_name=?, phone=?, email=?, website=?, category=?, country=?, rating=?, payment_terms=?, notes=?
    WHERE id=?
  `).run(name, contact_name, phone, email, website, category, country, rating, payment_terms, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM suppliers WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.get('/:id/orders', (req, res) => {
  const orders = db.prepare(`SELECT * FROM supplier_orders WHERE supplier_id = ? ORDER BY order_date DESC`).all(req.params.id);
  res.json(orders);
});

router.post('/:id/orders', (req, res) => {
  const { order_date, expected_delivery, total_amount, items, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO supplier_orders (supplier_id, order_date, expected_delivery, total_amount, items, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, order_date, expected_delivery, total_amount, items, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/orders/:id', (req, res) => {
  const { status, actual_delivery, notes } = req.body;
  db.prepare(`
    UPDATE supplier_orders SET status=?, actual_delivery=?, notes=? WHERE id=?
  `).run(status, actual_delivery, notes, req.params.id);
  res.json({ success: true });
});

export default router;
