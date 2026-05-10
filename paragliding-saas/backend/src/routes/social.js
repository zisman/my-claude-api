import { Router } from 'express';
import db from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateSocialPost, generateCampaignIdeas } from '../services/claude.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { status, platform } = req.query;
  let q = 'SELECT p.*, u.name as author_name FROM social_posts p LEFT JOIN users u ON p.created_by=u.id WHERE p.club_id=?';
  const params = [req.clubId];
  if (status) { q += ' AND p.status=?'; params.push(status); }
  if (platform) { q += ' AND p.platform=?'; params.push(platform); }
  q += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM social_posts WHERE id=? AND club_id=?').get(req.params.id, req.clubId);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

router.post('/', requireRole('admin', 'instructor'), (req, res) => {
  const { platform, content, status, scheduled_at, campaign_id, media_urls } = req.body;
  const r = db.prepare(`
    INSERT INTO social_posts (club_id, platform, content, status, scheduled_at, campaign_id, media_urls, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.clubId, platform, content, status || 'draft', scheduled_at, campaign_id, JSON.stringify(media_urls || []), req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'instructor'), (req, res) => {
  const { platform, content, status, scheduled_at, campaign_id, media_urls } = req.body;
  db.prepare(`
    UPDATE social_posts SET platform=?, content=?, status=?, scheduled_at=?, campaign_id=?, media_urls=?
    WHERE id=? AND club_id=?
  `).run(platform, content, status, scheduled_at, campaign_id, JSON.stringify(media_urls || []), req.params.id, req.clubId);
  res.json({ success: true });
});

router.delete('/:id', requireRole('admin', 'instructor'), (req, res) => {
  db.prepare('DELETE FROM social_posts WHERE id=? AND club_id=?').run(req.params.id, req.clubId);
  res.json({ success: true });
});

// AI generation
router.post('/generate', requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const club = db.prepare('SELECT name, address FROM clubs WHERE id=?').get(req.clubId);
    const content = await generateSocialPost({
      ...req.body,
      clubName: club.name,
      location: club.address,
    });
    res.json({ content });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

router.post('/campaign-ideas', requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const club = db.prepare('SELECT name FROM clubs WHERE id=?').get(req.clubId);
    const ideas = await generateCampaignIdeas({ ...req.body, clubName: club.name });
    res.json({ ideas });
  } catch (err) {
    console.error('Campaign ideas error:', err);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

export default router;
