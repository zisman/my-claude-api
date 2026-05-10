import { Router } from 'express';
import db from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const campaigns = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM social_posts p WHERE p.campaign_id=c.id) as post_count
    FROM campaigns c WHERE c.club_id=? ORDER BY c.created_at DESC
  `).all(req.clubId);
  res.json(campaigns);
});

router.get('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND club_id=?').get(req.params.id, req.clubId);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  const posts = db.prepare('SELECT * FROM social_posts WHERE campaign_id=? AND club_id=?').all(req.params.id, req.clubId);
  res.json({ ...campaign, posts });
});

router.post('/', requireRole('admin', 'instructor'), (req, res) => {
  const { name, type, status, target_audience, content, budget, start_date, end_date } = req.body;
  const r = db.prepare(`
    INSERT INTO campaigns (club_id, name, type, status, target_audience, content, budget, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, name, type, status || 'draft', target_audience, content, budget, start_date, end_date);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'instructor'), (req, res) => {
  const { name, type, status, target_audience, content, budget, start_date, end_date, metrics } = req.body;
  db.prepare(`
    UPDATE campaigns SET name=?, type=?, status=?, target_audience=?, content=?, budget=?, start_date=?, end_date=?, metrics=?
    WHERE id=? AND club_id=?
  `).run(name, type, status, target_audience, content, budget, start_date, end_date, JSON.stringify(metrics || {}), req.params.id, req.clubId);
  res.json({ success: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id=? AND club_id=?').run(req.params.id, req.clubId);
  res.json({ success: true });
});

export default router;
