import { Router } from 'express';
import db from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, u.name as instructor_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id AND e.status NOT IN ('dropped')) as enrolled_count
    FROM courses c LEFT JOIN users u ON c.instructor_id=u.id
    WHERE c.club_id=? ORDER BY c.start_date DESC
  `).all(req.clubId);
  res.json(courses);
});

router.get('/:id', (req, res) => {
  const course = db.prepare(`
    SELECT c.*, u.name as instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id=u.id
    WHERE c.id=? AND c.club_id=?
  `).get(req.params.id, req.clubId);
  if (!course) return res.status(404).json({ error: 'Not found' });
  const enrollments = db.prepare(`
    SELECT e.*, s.name as student_name, s.email as student_email, s.license_level
    FROM enrollments e JOIN students s ON e.student_id=s.id
    WHERE e.course_id=? AND e.club_id=?
  `).all(req.params.id, req.clubId);
  res.json({ ...course, enrollments });
});

router.post('/', requireRole('admin', 'instructor'), (req, res) => {
  const { name, description, level, duration_days, price, max_students, status, start_date, end_date, instructor_id } = req.body;
  const r = db.prepare(`
    INSERT INTO courses (club_id, instructor_id, name, description, level, duration_days, price, max_students, status, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, instructor_id || req.user.id, name, description, level, duration_days, price, max_students, status || 'draft', start_date, end_date);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'instructor'), (req, res) => {
  const { name, description, level, duration_days, price, max_students, status, start_date, end_date, instructor_id } = req.body;
  db.prepare(`
    UPDATE courses SET name=?, description=?, level=?, duration_days=?, price=?, max_students=?, status=?, start_date=?, end_date=?, instructor_id=?
    WHERE id=? AND club_id=?
  `).run(name, description, level, duration_days, price, max_students, status, start_date, end_date, instructor_id, req.params.id, req.clubId);
  res.json({ success: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM courses WHERE id=? AND club_id=?').run(req.params.id, req.clubId);
  res.json({ success: true });
});

// Enrollments
router.post('/:id/enroll', requireRole('admin', 'instructor'), (req, res) => {
  const { student_id } = req.body;
  try {
    const r = db.prepare(`
      INSERT INTO enrollments (club_id, course_id, student_id, status) VALUES (?, ?, ?, 'enrolled')
    `).run(req.clubId, req.params.id, student_id);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'Student already enrolled' });
  }
});

router.put('/:id/enrollments/:enrollId', requireRole('admin', 'instructor'), (req, res) => {
  const { status, grade, notes, completion_date } = req.body;
  db.prepare(`UPDATE enrollments SET status=?, grade=?, notes=?, completion_date=? WHERE id=? AND club_id=?`)
    .run(status, grade, notes, completion_date, req.params.enrollId, req.clubId);
  res.json({ success: true });
});

export default router;
