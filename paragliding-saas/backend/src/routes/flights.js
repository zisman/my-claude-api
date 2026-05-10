import { Router } from 'express';
import db from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { status, from, to } = req.query;
  let q = `SELECT f.*, u.name as pilot_name FROM experience_flights f JOIN users u ON f.pilot_id=u.id WHERE f.club_id=?`;
  const params = [req.clubId];
  if (status) { q += ' AND f.status=?'; params.push(status); }
  if (from) { q += ' AND f.flight_date>=?'; params.push(from); }
  if (to) { q += ' AND f.flight_date<=?'; params.push(to); }
  q += ' ORDER BY f.flight_date DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/:id', (req, res) => {
  const flight = db.prepare(`
    SELECT f.*, u.name as pilot_name FROM experience_flights f JOIN users u ON f.pilot_id=u.id
    WHERE f.id=? AND f.club_id=?
  `).get(req.params.id, req.clubId);
  if (!flight) return res.status(404).json({ error: 'Not found' });
  res.json(flight);
});

router.post('/', requireRole('admin', 'instructor'), (req, res) => {
  const { pilot_id, passenger_name, passenger_email, passenger_phone, flight_date, duration_minutes, takeoff_location, landing_location, status, price, payment_status, notes, equipment_id } = req.body;
  const r = db.prepare(`
    INSERT INTO experience_flights (club_id, pilot_id, passenger_name, passenger_email, passenger_phone, flight_date, duration_minutes, takeoff_location, landing_location, status, price, payment_status, notes, equipment_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, pilot_id || req.user.id, passenger_name, passenger_email, passenger_phone, flight_date, duration_minutes, takeoff_location, landing_location, status || 'scheduled', price, payment_status || 'pending', notes, equipment_id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'instructor'), (req, res) => {
  const { pilot_id, passenger_name, passenger_email, passenger_phone, flight_date, duration_minutes, takeoff_location, landing_location, status, price, payment_status, notes, equipment_id, weather_conditions } = req.body;
  db.prepare(`
    UPDATE experience_flights SET pilot_id=?, passenger_name=?, passenger_email=?, passenger_phone=?, flight_date=?, duration_minutes=?, takeoff_location=?, landing_location=?, status=?, price=?, payment_status=?, notes=?, equipment_id=?, weather_conditions=?
    WHERE id=? AND club_id=?
  `).run(pilot_id, passenger_name, passenger_email, passenger_phone, flight_date, duration_minutes, takeoff_location, landing_location, status, price, payment_status, notes, equipment_id, weather_conditions, req.params.id, req.clubId);
  res.json({ success: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM experience_flights WHERE id=? AND club_id=?').run(req.params.id, req.clubId);
  res.json({ success: true });
});

router.get('/stats/summary', (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(price),0) as revenue FROM experience_flights WHERE club_id=?").get(req.clubId);
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM experience_flights WHERE club_id=? GROUP BY status").all(req.clubId);
  const upcoming = db.prepare("SELECT COUNT(*) as count FROM experience_flights WHERE club_id=? AND status='scheduled' AND flight_date >= date('now')").get(req.clubId);
  res.json({ ...total, byStatus, upcomingCount: upcoming.count });
});

export default router;
