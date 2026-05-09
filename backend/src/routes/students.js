import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const students = db.prepare(`SELECT * FROM students ORDER BY name`).all();
  res.json(students);
});

router.get('/:id', (req, res) => {
  const student = db.prepare(`SELECT * FROM students WHERE id = ?`).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'לא נמצא' });
  const enrollments = db.prepare(`
    SELECT se.*, c.name as course_name, c.level FROM student_enrollments se
    JOIN courses c ON se.course_id = c.id WHERE se.student_id = ?
  `).all(req.params.id);
  const tests = db.prepare(`SELECT * FROM theory_tests WHERE student_id = ? ORDER BY test_date DESC`).all(req.params.id);
  res.json({ ...student, enrollments, tests });
});

router.post('/', (req, res) => {
  const { name, phone, email, birth_date, instructor, medical_clearance, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO students (name, phone, email, birth_date, instructor, medical_clearance, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, email, birth_date, instructor, medical_clearance ? 1 : 0, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, phone, email, current_level, instructor, status, medical_clearance, notes } = req.body;
  db.prepare(`
    UPDATE students SET name=?, phone=?, email=?, current_level=?, instructor=?, status=?, medical_clearance=?, notes=?
    WHERE id=?
  `).run(name, phone, email, current_level, instructor, status, medical_clearance ? 1 : 0, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM students WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.get('/courses', (req, res) => {
  const courses = db.prepare(`SELECT * FROM courses ORDER BY level, name`).all();
  res.json(courses);
});

router.post('/courses', (req, res) => {
  const { name, level, description, duration_hours, price, max_students, instructor } = req.body;
  const result = db.prepare(`
    INSERT INTO courses (name, level, description, duration_hours, price, max_students, instructor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, level, description, duration_hours, price, max_students || 10, instructor);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/:id/enroll', (req, res) => {
  const { course_id } = req.body;
  const result = db.prepare(`
    INSERT INTO student_enrollments (student_id, course_id) VALUES (?, ?)
  `).run(req.params.id, course_id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/:id/tests', (req, res) => {
  const { course_id, test_name, score, max_score, test_date } = req.body;
  const passed = score >= (max_score || 100) * 0.6 ? 1 : 0;
  const result = db.prepare(`
    INSERT INTO theory_tests (student_id, course_id, test_name, score, max_score, passed, test_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, course_id, test_name, score, max_score || 100, passed, test_date || new Date().toISOString().split('T')[0]);
  res.status(201).json({ id: result.lastInsertRowid, passed });
});

export default router;
