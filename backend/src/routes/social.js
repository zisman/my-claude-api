import { Router } from 'express';
import db from '../database.js';
import { generateSocialPost } from '../services/claude.js';

const router = Router();

// רשימת פוסטים
router.get('/posts', (req, res) => {
  const { status, type } = req.query;
  let query = `SELECT * FROM social_posts WHERE 1=1`;
  const params = [];
  if (status) { query += ` AND status=?`; params.push(status); }
  if (type) { query += ` AND post_type=?`; params.push(type); }
  query += ` ORDER BY COALESCE(scheduled_at, created_at) DESC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/posts', (req, res) => {
  const { title, content_facebook, content_instagram, content_whatsapp, post_type, platforms, scheduled_at, status, image_suggestion, hashtags, ai_generated, campaign_id } = req.body;
  const result = db.prepare(`
    INSERT INTO social_posts (title, content_facebook, content_instagram, content_whatsapp, post_type, platforms, scheduled_at, status, image_suggestion, hashtags, ai_generated, campaign_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(title, content_facebook, content_instagram, content_whatsapp, post_type || 'general', platforms || 'facebook', scheduled_at, status || 'draft', image_suggestion, hashtags, ai_generated ? 1 : 0, campaign_id || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/posts/:id', (req, res) => {
  const { title, content_facebook, content_instagram, content_whatsapp, post_type, platforms, scheduled_at, status, image_suggestion, hashtags } = req.body;
  db.prepare(`
    UPDATE social_posts SET title=?, content_facebook=?, content_instagram=?, content_whatsapp=?,
      post_type=?, platforms=?, scheduled_at=?, status=?, image_suggestion=?, hashtags=?
    WHERE id=?
  `).run(title, content_facebook, content_instagram, content_whatsapp, post_type, platforms, scheduled_at, status, image_suggestion, hashtags, req.params.id);
  res.json({ success: true });
});

router.delete('/posts/:id', (req, res) => {
  db.prepare(`DELETE FROM social_posts WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// פרסום פוסט (simulation - בפועל ידרש OAuth לכל רשת)
router.post('/posts/:id/publish', (req, res) => {
  const post = db.prepare(`SELECT * FROM social_posts WHERE id=?`).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'לא נמצא' });
  db.prepare(`UPDATE social_posts SET status='published', published_at=datetime('now'), likes=?, reach=? WHERE id=?`)
    .run(Math.floor(Math.random() * 50) + 5, Math.floor(Math.random() * 800) + 200, req.params.id);
  res.json({ success: true, message: 'פוסט פורסם (simulation)' });
});

// יצירת פוסט עם AI
router.post('/generate', async (req, res) => {
  const { topic, post_type, reference_type, reference_id } = req.body;

  // אוסף הקשר מהמערכת
  const context = {
    upcoming_events: db.prepare(`SELECT name, event_date, location, price FROM events WHERE event_date >= date('now') ORDER BY event_date LIMIT 3`).all(),
    upcoming_flights: db.prepare(`SELECT COUNT(*) as c FROM experience_flights WHERE status='confirmed' AND flight_date >= date('now')`).get().c,
    active_courses: db.prepare(`SELECT name, level, price FROM courses WHERE status='active' LIMIT 3`).all(),
    recent_achievements: db.prepare(`SELECT name, current_level FROM students WHERE status='active' ORDER BY created_at DESC LIMIT 3`).all(),
    club_stats: {
      total_members: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE status='active'`).get().c,
      total_students: db.prepare(`SELECT COUNT(*) as c FROM students WHERE status='active'`).get().c,
    }
  };

  if (reference_type === 'event' && reference_id) {
    context.specific_event = db.prepare(`SELECT * FROM events WHERE id=?`).get(reference_id);
  }
  if (reference_type === 'student' && reference_id) {
    context.specific_student = db.prepare(`SELECT name, current_level FROM students WHERE id=?`).get(reference_id);
  }

  try {
    const result = await generateSocialPost(topic || 'פוסט כללי לקידום המועדון', context);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// קמפיינים
router.get('/campaigns', (req, res) => {
  res.json(db.prepare(`SELECT * FROM social_campaigns ORDER BY created_at DESC`).all());
});

router.post('/campaigns', (req, res) => {
  const { name, objective, platform, budget, start_date, end_date, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO social_campaigns (name, objective, platform, budget, start_date, end_date, notes)
    VALUES (?,?,?,?,?,?,?)
  `).run(name, objective || 'awareness', platform || 'facebook', budget || 0, start_date, end_date, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/campaigns/:id', (req, res) => {
  const { name, objective, platform, budget, spent, start_date, end_date, status, leads_generated, conversions, impressions, clicks, notes } = req.body;
  db.prepare(`
    UPDATE social_campaigns SET name=?, objective=?, platform=?, budget=?, spent=?,
      start_date=?, end_date=?, status=?, leads_generated=?, conversions=?, impressions=?, clicks=?, notes=?
    WHERE id=?
  `).run(name, objective, platform, budget, spent || 0, start_date, end_date, status, leads_generated || 0, conversions || 0, impressions || 0, clicks || 0, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/campaigns/:id', (req, res) => {
  db.prepare(`DELETE FROM social_campaigns WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// אנליטיקה
router.get('/analytics', (req, res) => {
  const stats = {
    total_posts: db.prepare(`SELECT COUNT(*) as c FROM social_posts`).get().c,
    published: db.prepare(`SELECT COUNT(*) as c FROM social_posts WHERE status='published'`).get().c,
    scheduled: db.prepare(`SELECT COUNT(*) as c FROM social_posts WHERE status='scheduled'`).get().c,
    total_reach: db.prepare(`SELECT COALESCE(SUM(reach),0) as s FROM social_posts WHERE status='published'`).get().s,
    total_likes: db.prepare(`SELECT COALESCE(SUM(likes),0) as s FROM social_posts WHERE status='published'`).get().s,
    total_shares: db.prepare(`SELECT COALESCE(SUM(shares),0) as s FROM social_posts WHERE status='published'`).get().s,
    total_campaigns: db.prepare(`SELECT COUNT(*) as c FROM social_campaigns`).get().c,
    active_campaigns: db.prepare(`SELECT COUNT(*) as c FROM social_campaigns WHERE status='active'`).get().c,
    total_budget: db.prepare(`SELECT COALESCE(SUM(budget),0) as s FROM social_campaigns`).get().s,
    total_spent: db.prepare(`SELECT COALESCE(SUM(spent),0) as s FROM social_campaigns`).get().s,
    total_campaign_leads: db.prepare(`SELECT COALESCE(SUM(leads_generated),0) as s FROM social_campaigns`).get().s,
    by_type: db.prepare(`SELECT post_type, COUNT(*) as count, COALESCE(SUM(reach),0) as reach, COALESCE(SUM(likes),0) as likes FROM social_posts WHERE status='published' GROUP BY post_type`).all(),
    top_posts: db.prepare(`SELECT * FROM social_posts WHERE status='published' ORDER BY likes DESC LIMIT 5`).all(),
  };
  res.json(stats);
});

export default router;
