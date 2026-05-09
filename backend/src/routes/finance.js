import { Router } from 'express';
import db from '../database.js';

const router = Router();

// סיכום כספי - לוח בקרה
router.get('/summary', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const monthStr = `${year}-${month}`;

  const summary = {
    this_month: {
      income: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE payment_date LIKE ? AND status='paid'`).get(`${monthStr}%`).s,
      expenses: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM expenses WHERE expense_date LIKE ? AND status='paid'`).get(`${monthStr}%`).s,
    },
    this_year: {
      income: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE payment_date LIKE ? AND status='paid'`).get(`${year}%`).s,
      expenses: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM expenses WHERE expense_date LIKE ? AND status='paid'`).get(`${year}%`).s,
    },
    pending_income: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='pending'`).get().s,
    pending_expenses: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM expenses WHERE status='pending'`).get().s,
    dues_unpaid: db.prepare(`SELECT COALESCE(SUM(amount_due - amount_paid),0) as s FROM member_dues WHERE status IN ('pending','partial')`).get().s,
    debtors_count: db.prepare(`SELECT COUNT(*) as c FROM member_dues WHERE status IN ('pending','partial')`).get().c,
    by_type: db.prepare(`SELECT payment_type, COALESCE(SUM(amount),0) as total FROM payments WHERE payment_date LIKE ? AND status='paid' GROUP BY payment_type`).all(`${year}%`),
    expense_by_category: db.prepare(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date LIKE ? AND status='paid' GROUP BY category`).all(`${year}%`),
    monthly: db.prepare(`
      SELECT substr(p.payment_date,1,7) as month,
        COALESCE(SUM(p.amount),0) as income
      FROM payments p WHERE p.status='paid' AND p.payment_date LIKE ?
      GROUP BY month ORDER BY month
    `).all(`${year}%`),
    monthly_expenses: db.prepare(`
      SELECT substr(e.expense_date,1,7) as month,
        COALESCE(SUM(e.amount),0) as expenses
      FROM expenses e WHERE e.status='paid' AND e.expense_date LIKE ?
      GROUP BY month ORDER BY month
    `).all(`${year}%`),
    recent_payments: db.prepare(`SELECT * FROM payments ORDER BY payment_date DESC, created_at DESC LIMIT 8`).all(),
    recent_expenses: db.prepare(`SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC LIMIT 8`).all(),
  };

  res.json(summary);
});

// תשלומים
router.get('/payments', (req, res) => {
  const { type, status, month, year, payer } = req.query;
  let query = `SELECT * FROM payments WHERE 1=1`;
  const params = [];
  if (type) { query += ` AND payment_type=?`; params.push(type); }
  if (status) { query += ` AND status=?`; params.push(status); }
  if (year) { query += ` AND payment_date LIKE ?`; params.push(`${year}%`); }
  if (month) { query += ` AND payment_date LIKE ?`; params.push(`${month}%`); }
  if (payer) { query += ` AND payer_name LIKE ?`; params.push(`%${payer}%`); }
  query += ` ORDER BY payment_date DESC, created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/payments', (req, res) => {
  const { payment_date, amount, payment_type, payment_method, payer_type, payer_id, payer_name, description, status, receipt_number, notes } = req.body;

  const count = db.prepare(`SELECT COUNT(*) as c FROM payments`).get().c;
  const autoReceipt = receipt_number || `REC-${String(count + 1).padStart(3, '0')}`;

  const result = db.prepare(`
    INSERT INTO payments (payment_date, amount, payment_type, payment_method, payer_type, payer_id, payer_name, description, status, receipt_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(payment_date || new Date().toISOString().split('T')[0], amount, payment_type, payment_method || 'cash', payer_type, payer_id, payer_name, description, status || 'paid', autoReceipt, notes);

  res.status(201).json({ id: result.lastInsertRowid, receipt_number: autoReceipt });
});

router.put('/payments/:id', (req, res) => {
  const { payment_date, amount, payment_type, payment_method, payer_name, description, status, notes } = req.body;
  db.prepare(`
    UPDATE payments SET payment_date=?, amount=?, payment_type=?, payment_method=?, payer_name=?, description=?, status=?, notes=?
    WHERE id=?
  `).run(payment_date, amount, payment_type, payment_method, payer_name, description, status, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/payments/:id', (req, res) => {
  db.prepare(`DELETE FROM payments WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// הוצאות
router.get('/expenses', (req, res) => {
  const { category, status, year } = req.query;
  let query = `SELECT e.*, s.name as supplier_name FROM expenses e LEFT JOIN suppliers s ON e.supplier_id = s.id WHERE 1=1`;
  const params = [];
  if (category) { query += ` AND e.category=?`; params.push(category); }
  if (status) { query += ` AND e.status=?`; params.push(status); }
  if (year) { query += ` AND e.expense_date LIKE ?`; params.push(`${year}%`); }
  query += ` ORDER BY e.expense_date DESC, e.created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/expenses', (req, res) => {
  const { expense_date, amount, category, supplier_id, description, payment_method, status, invoice_number, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO expenses (expense_date, amount, category, supplier_id, description, payment_method, status, invoice_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(expense_date || new Date().toISOString().split('T')[0], amount, category, supplier_id || null, description, payment_method || 'transfer', status || 'paid', invoice_number, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/expenses/:id', (req, res) => {
  const { expense_date, amount, category, description, payment_method, status, invoice_number, notes } = req.body;
  db.prepare(`
    UPDATE expenses SET expense_date=?, amount=?, category=?, description=?, payment_method=?, status=?, invoice_number=?, notes=?
    WHERE id=?
  `).run(expense_date, amount, category, description, payment_method, status, invoice_number, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/expenses/:id', (req, res) => {
  db.prepare(`DELETE FROM expenses WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// דמי חבר
router.get('/dues', (req, res) => {
  const { year, status, member_type } = req.query;
  const y = year || new Date().getFullYear();
  let query = `SELECT * FROM member_dues WHERE year=?`;
  const params = [y];
  if (status) { query += ` AND status=?`; params.push(status); }
  if (member_type) { query += ` AND member_type=?`; params.push(member_type); }
  query += ` ORDER BY status, member_name`;
  res.json(db.prepare(query).all(...params));
});

router.post('/dues', (req, res) => {
  const { year, member_type, member_id, member_name, member_phone, amount_due, due_date, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO member_dues (year, member_type, member_id, member_name, member_phone, amount_due, amount_paid, due_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)
  `).run(year || new Date().getFullYear(), member_type, member_id, member_name, member_phone, amount_due, due_date, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/dues/:id/pay', (req, res) => {
  const { amount_paid, payment_method, notes } = req.body;
  const due = db.prepare(`SELECT * FROM member_dues WHERE id=?`).get(req.params.id);
  if (!due) return res.status(404).json({ error: 'לא נמצא' });

  const newPaid = (due.amount_paid || 0) + Number(amount_paid);
  const newStatus = newPaid >= due.amount_due ? 'paid' : 'partial';

  let paymentId = null;
  if (amount_paid > 0) {
    const pr = db.prepare(`
      INSERT INTO payments (payment_date, amount, payment_type, payment_method, payer_name, payer_type, payer_id, description, status)
      VALUES (date('now'), ?, 'membership', ?, ?, ?, ?, ?, 'paid')
    `).run(amount_paid, payment_method || 'cash', due.member_name, due.member_type, due.member_id, `דמי חבר ${due.year}`);
    paymentId = pr.lastInsertRowid;
  }

  db.prepare(`UPDATE member_dues SET amount_paid=?, status=?, payment_id=?, notes=? WHERE id=?`)
    .run(newPaid, newStatus, paymentId, notes || due.notes, req.params.id);

  res.json({ success: true, status: newStatus, amount_paid: newPaid });
});

router.delete('/dues/:id', (req, res) => {
  db.prepare(`DELETE FROM member_dues WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// חייבים - רשימה מאוחדת
router.get('/debtors', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const debtors = db.prepare(`
    SELECT member_name, member_phone, member_type,
      SUM(amount_due) as total_due,
      SUM(amount_paid) as total_paid,
      SUM(amount_due - amount_paid) as balance,
      GROUP_CONCAT(year) as years,
      MIN(due_date) as earliest_due,
      COUNT(*) as open_dues
    FROM member_dues
    WHERE status IN ('pending','partial')
    GROUP BY member_id, member_name, member_type
    ORDER BY balance DESC
  `).all();
  res.json(debtors);
});

// דוח חודשי להשוואה
router.get('/monthly-report', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ms = `${year}-${String(m).padStart(2, '0')}`;
    const income = db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE payment_date LIKE ? AND status='paid'`).get(`${ms}%`).s;
    const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM expenses WHERE expense_date LIKE ? AND status='paid'`).get(`${ms}%`).s;
    months.push({ month: ms, income, expenses, profit: income - expenses });
  }
  res.json(months);
});

export default router;
