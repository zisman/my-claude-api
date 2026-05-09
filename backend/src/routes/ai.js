import { Router } from 'express';
import db from '../database.js';
import { analyzeMaintenanceForecast, analyzeWeatherSafety, analyzeStudentProgress, analyzeMarketingInsights, streamChat } from '../services/claude.js';

const router = Router();

router.post('/maintenance-forecast', async (req, res) => {
  const { equipment_id } = req.body;
  const equipment = db.prepare(`SELECT * FROM equipment WHERE id = ?`).get(equipment_id);
  if (!equipment) return res.status(404).json({ error: 'ציוד לא נמצא' });
  try {
    const forecast = await analyzeMaintenanceForecast(equipment);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/weather-analysis', async (req, res) => {
  const { weatherData, site } = req.body;
  try {
    const analysis = await analyzeWeatherSafety(weatherData);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/student-analysis', async (req, res) => {
  const { student_id } = req.body;
  const student = db.prepare(`SELECT * FROM students WHERE id = ?`).get(student_id);
  if (!student) return res.status(404).json({ error: 'תלמיד לא נמצא' });

  const enrollments = db.prepare(`
    SELECT se.*, c.name as course_name FROM student_enrollments se
    JOIN courses c ON se.course_id = c.id WHERE se.student_id = ?
  `).all(student_id);
  const tests = db.prepare(`SELECT * FROM theory_tests WHERE student_id = ?`).all(student_id);
  const progress = db.prepare(`SELECT * FROM lesson_progress WHERE student_id = ?`).all(student_id);

  try {
    const analysis = await analyzeStudentProgress(student, enrollments, tests, progress);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketing-insights', async (req, res) => {
  const campaigns = db.prepare(`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 10`).all();
  const leads = db.prepare(`SELECT source, status, COUNT(*) as count FROM leads GROUP BY source, status`).all();
  const customers = db.prepare(`
    SELECT membership_type, COUNT(*) as count, AVG(total_flights) as avg_flights FROM customers GROUP BY membership_type
  `).all();

  try {
    const insights = await analyzeMarketingInsights(campaigns, leads, customers);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    for await (const chunk of streamChat(messages)) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
