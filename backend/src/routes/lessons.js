import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/modules', (req, res) => {
  const modules = db.prepare(`
    SELECT lm.*, c.name as course_name
    FROM lesson_modules lm LEFT JOIN courses c ON lm.course_id = c.id
    WHERE lm.status = 'published' ORDER BY lm.course_id, lm.order_num
  `).all();
  res.json(modules);
});

router.get('/modules/:id', (req, res) => {
  const module = db.prepare(`SELECT * FROM lesson_modules WHERE id = ?`).get(req.params.id);
  if (!module) return res.status(404).json({ error: 'לא נמצא' });
  const quizzes = db.prepare(`SELECT * FROM lesson_quizzes WHERE module_id = ? ORDER BY order_num`).all(req.params.id);
  res.json({ ...module, quizzes });
});

router.post('/modules', (req, res) => {
  const { course_id, title, description, content, video_url, order_num, duration_minutes, level } = req.body;
  const result = db.prepare(`
    INSERT INTO lesson_modules (course_id, title, description, content, video_url, order_num, duration_minutes, level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(course_id, title, description, content, video_url, order_num || 1, duration_minutes, level || 'beginner');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/modules/:id/quizzes', (req, res) => {
  const { question, options, correct_answer, explanation, order_num } = req.body;
  const result = db.prepare(`
    INSERT INTO lesson_quizzes (module_id, question, options, correct_answer, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, question, JSON.stringify(options), correct_answer, explanation, order_num || 1);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/progress/:studentId', (req, res) => {
  const progress = db.prepare(`
    SELECT lp.*, lm.title, lm.order_num, lm.course_id
    FROM lesson_progress lp
    JOIN lesson_modules lm ON lp.module_id = lm.id
    WHERE lp.student_id = ?
    ORDER BY lm.course_id, lm.order_num
  `).all(req.params.studentId);
  res.json(progress);
});

router.post('/progress', (req, res) => {
  const { student_id, module_id, completed, quiz_score } = req.body;
  const existing = db.prepare(`SELECT * FROM lesson_progress WHERE student_id = ? AND module_id = ?`).get(student_id, module_id);

  if (existing) {
    db.prepare(`
      UPDATE lesson_progress SET completed=?, quiz_score=?, quiz_attempts=quiz_attempts+1,
      last_watched_at=datetime('now'), completed_at=CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END
      WHERE student_id=? AND module_id=?
    `).run(completed ? 1 : 0, quiz_score, completed ? 1 : 0, student_id, module_id);
  } else {
    db.prepare(`
      INSERT INTO lesson_progress (student_id, module_id, completed, quiz_score, last_watched_at, completed_at)
      VALUES (?, ?, ?, ?, datetime('now'), CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
    `).run(student_id, module_id, completed ? 1 : 0, quiz_score, completed ? 1 : 0);
  }
  res.json({ success: true });
});

router.get('/courses', (req, res) => {
  const courses = db.prepare(`SELECT * FROM courses WHERE status = 'active' ORDER BY level, name`).all();
  res.json(courses);
});

export default router;
