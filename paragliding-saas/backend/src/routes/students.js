import { Router } from 'express';
import db from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const students = db.prepare('SELECT * FROM students WHERE club_id = ? ORDER BY name').all(req.clubId);
  res.json(students);
});

router.get('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id=? AND club_id=?').get(req.params.id, req.clubId);
  if (!student) return res.status(404).json({ error: 'Not found' });
  const enrollments = db.prepare(`
    SELECT e.*, c.name as course_name, c.level, c.start_date
    FROM enrollments e JOIN courses c ON e.course_id=c.id
    WHERE e.student_id=? AND e.club_id=?
  `).all(req.params.id, req.clubId);
  res.json({ ...student, enrollments });
});

router.post('/', requireRole('admin', 'instructor'), (req, res) => {
  const { name, email, phone, date_of_birth, emergency_contact, medical_info, license_level } = req.body;
  const r = db.prepare(`
    INSERT INTO students (club_id, name, email, phone, date_of_birth, emergency_contact, medical_info, license_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, name, email, phone, date_of_birth, emergency_contact, medical_info, license_level);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'instructor'), (req, res) => {
  const { name, email, phone, date_of_birth, emergency_contact, medical_info, license_level, total_flights, total_hours } = req.body;
  db.prepare(`
    UPDATE students SET name=?, email=?, phone=?, date_of_birth=?, emergency_contact=?, medical_info=?, license_level=?, total_flights=?, total_hours=?, updated_at=datetime('now')
    WHERE id=? AND club_id=?
  `).run(name, email, phone, date_of_birth, emergency_contact, medical_info, license_level, total_flights, total_hours, req.params.id, req.clubId);
  res.json({ success: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM students WHERE id=? AND club_id=?').run(req.params.id, req.clubId);
  res.json({ success: true });
});

export default router;
