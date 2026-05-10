import { Router } from 'express';
import db from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM equipment WHERE club_id = ? ORDER BY name').all(req.clubId);
  res.json(items);
});

router.post('/', requireRole('admin', 'instructor'), (req, res) => {
  const { name, type, brand, model, serial_number, purchase_date, purchase_price, status, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO equipment (club_id, name, type, brand, model, serial_number, purchase_date, purchase_price, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, name, type, brand, model, serial_number, purchase_date, purchase_price, status || 'active', notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'instructor'), (req, res) => {
  const { name, type, brand, model, serial_number, purchase_date, purchase_price, status, notes, flight_hours } = req.body;
  db.prepare(`
    UPDATE equipment SET name=?, type=?, brand=?, model=?, serial_number=?, purchase_date=?, purchase_price=?, status=?, notes=?, flight_hours=?, updated_at=datetime('now')
    WHERE id=? AND club_id=?
  `).run(name, type, brand, model, serial_number, purchase_date, purchase_price, status, notes, flight_hours, req.params.id, req.clubId);
  res.json({ success: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM equipment WHERE id = ? AND club_id = ?').run(req.params.id, req.clubId);
  res.json({ success: true });
});

// Safety checks
router.get('/safety-checks', (req, res) => {
  const checks = db.prepare(`
    SELECT sc.*, e.name as equipment_name, u.name as inspector_name
    FROM safety_checks sc
    JOIN equipment e ON sc.equipment_id = e.id
    JOIN users u ON sc.inspector_id = u.id
    WHERE sc.club_id = ?
    ORDER BY sc.check_date DESC
  `).all(req.clubId);
  res.json(checks);
});

router.post('/safety-checks', requireRole('admin', 'instructor'), (req, res) => {
  const { equipment_id, check_date, result, notes, next_check_date } = req.body;
  const r = db.prepare(`
    INSERT INTO safety_checks (club_id, equipment_id, inspector_id, check_date, result, notes, next_check_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, equipment_id, req.user.id, check_date, result, notes, next_check_date);
  db.prepare('UPDATE equipment SET last_inspection=?, next_inspection=?, updated_at=datetime("now") WHERE id=? AND club_id=?')
    .run(check_date, next_check_date, equipment_id, req.clubId);
  res.status(201).json({ id: r.lastInsertRowid });
});

export default router;
