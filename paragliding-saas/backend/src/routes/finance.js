import { Router } from 'express';
import db from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Categories
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM finance_categories WHERE club_id = ?').all(req.clubId));
});

router.post('/categories', requireRole('admin'), (req, res) => {
  const { name, type, color } = req.body;
  const r = db.prepare('INSERT INTO finance_categories (club_id, name, type, color) VALUES (?, ?, ?, ?)').run(req.clubId, name, type, color);
  res.status(201).json({ id: r.lastInsertRowid });
});

// Transactions
router.get('/transactions', (req, res) => {
  const { from, to, type, category_id } = req.query;
  let q = 'SELECT t.*, c.name as category_name, c.color as category_color, u.name as user_name FROM transactions t LEFT JOIN finance_categories c ON t.category_id=c.id LEFT JOIN users u ON t.user_id=u.id WHERE t.club_id=?';
  const params = [req.clubId];
  if (from) { q += ' AND t.date >= ?'; params.push(from); }
  if (to) { q += ' AND t.date <= ?'; params.push(to); }
  if (type) { q += ' AND t.type = ?'; params.push(type); }
  if (category_id) { q += ' AND t.category_id = ?'; params.push(category_id); }
  q += ' ORDER BY t.date DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/transactions', requireRole('admin', 'instructor'), (req, res) => {
  const { category_id, user_id, amount, type, description, date, payment_method, reference } = req.body;
  const r = db.prepare(`
    INSERT INTO transactions (club_id, category_id, user_id, amount, type, description, date, payment_method, reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, category_id, user_id || null, amount, type, description, date, payment_method, reference);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/transactions/:id', requireRole('admin'), (req, res) => {
  const { category_id, amount, type, description, date, payment_method } = req.body;
  db.prepare(`UPDATE transactions SET category_id=?, amount=?, type=?, description=?, date=?, payment_method=? WHERE id=? AND club_id=?`)
    .run(category_id, amount, type, description, date, payment_method, req.params.id, req.clubId);
  res.json({ success: true });
});

router.delete('/transactions/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id=? AND club_id=?').run(req.params.id, req.clubId);
  res.json({ success: true });
});

// Summary report
router.get('/summary', (req, res) => {
  const { year, month } = req.query;
  let dateFilter = '';
  const params = [req.clubId];
  if (year && month) {
    dateFilter = ` AND strftime('%Y-%m', date) = ?`;
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (year) {
    dateFilter = ` AND strftime('%Y', date) = ?`;
    params.push(year);
  }
  const income = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE club_id=? AND type='income'${dateFilter}`).get(...params).total;
  const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE club_id=? AND type='expense'${dateFilter}`).get(...params).total;
  const byCategory = db.prepare(`
    SELECT c.name, c.color, c.type, COALESCE(SUM(t.amount),0) as total
    FROM finance_categories c
    LEFT JOIN transactions t ON t.category_id=c.id AND t.club_id=?${dateFilter}
    WHERE c.club_id=?
    GROUP BY c.id ORDER BY total DESC
  `).all(...params, req.clubId);
  res.json({ income, expense, net: income - expense, byCategory });
});

export default router;
