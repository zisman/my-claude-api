import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const flights = db.prepare(`SELECT * FROM experience_flights ORDER BY flight_date DESC`).all();
  res.json(flights);
});

router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_email, flight_date, flight_time, pilot, location, duration_minutes, price, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO experience_flights (customer_name, customer_phone, customer_email, flight_date, flight_time, pilot, location, duration_minutes, price, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(customer_name, customer_phone, customer_email, flight_date, flight_time, pilot, location, duration_minutes || 20, price, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { customer_name, customer_phone, customer_email, flight_date, flight_time, pilot, location, duration_minutes, price, status, payment_status, waiver_signed, notes } = req.body;
  db.prepare(`
    UPDATE experience_flights SET customer_name=?, customer_phone=?, customer_email=?, flight_date=?, flight_time=?, pilot=?, location=?, duration_minutes=?, price=?, status=?, payment_status=?, waiver_signed=?, notes=?
    WHERE id=?
  `).run(customer_name, customer_phone, customer_email, flight_date, flight_time, pilot, location, duration_minutes, price, status, payment_status, waiver_signed ? 1 : 0, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM experience_flights WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.get('/events', (req, res) => {
  const events = db.prepare(`SELECT * FROM events ORDER BY event_date`).all();
  const eventsWithCounts = events.map(e => ({
    ...e,
    registration_count: db.prepare(`SELECT COUNT(*) as c FROM event_registrations WHERE event_id = ?`).get(e.id).c
  }));
  res.json(eventsWithCounts);
});

router.post('/events', (req, res) => {
  const { name, description, event_date, location, max_participants, price, type, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO events (name, description, event_date, location, max_participants, price, type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description, event_date, location, max_participants, price || 0, type, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/events/:id', (req, res) => {
  const { name, description, event_date, location, max_participants, price, status, type, notes } = req.body;
  db.prepare(`
    UPDATE events SET name=?, description=?, event_date=?, location=?, max_participants=?, price=?, status=?, type=?, notes=?
    WHERE id=?
  `).run(name, description, event_date, location, max_participants, price, status, type, notes, req.params.id);
  res.json({ success: true });
});

router.post('/events/:id/register', (req, res) => {
  const { customer_id, customer_name, customer_phone } = req.body;
  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(req.params.id);
  if (!event) return res.status(404).json({ error: 'אירוע לא נמצא' });
  const count = db.prepare(`SELECT COUNT(*) as c FROM event_registrations WHERE event_id = ?`).get(req.params.id).c;
  if (event.max_participants && count >= event.max_participants) {
    return res.status(400).json({ error: 'האירוע מלא' });
  }
  const result = db.prepare(`
    INSERT INTO event_registrations (event_id, customer_id, customer_name, customer_phone)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, customer_id, customer_name, customer_phone);
  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
