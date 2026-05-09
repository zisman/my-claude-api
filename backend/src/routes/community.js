import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/posts', (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comment_count
    FROM community_posts p ORDER BY p.pinned DESC, p.created_at DESC
  `).all();
  res.json(posts);
});

router.get('/posts/:id', (req, res) => {
  const post = db.prepare(`SELECT * FROM community_posts WHERE id = ?`).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'לא נמצא' });
  const comments = db.prepare(`SELECT * FROM community_comments WHERE post_id = ? ORDER BY created_at`).all(req.params.id);
  res.json({ ...post, comments });
});

router.post('/posts', (req, res) => {
  const { author_name, title, content, type } = req.body;
  const result = db.prepare(`
    INSERT INTO community_posts (author_name, title, content, type) VALUES (?, ?, ?, ?)
  `).run(author_name, title, content, type || 'post');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/posts/:id', (req, res) => {
  const { title, content, pinned } = req.body;
  db.prepare(`
    UPDATE community_posts SET title=?, content=?, pinned=?, updated_at=datetime('now') WHERE id=?
  `).run(title, content, pinned ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/posts/:id', (req, res) => {
  db.prepare(`DELETE FROM community_comments WHERE post_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM community_posts WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.post('/posts/:id/like', (req, res) => {
  db.prepare(`UPDATE community_posts SET likes = likes + 1 WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.post('/posts/:id/comments', (req, res) => {
  const { author_name, content } = req.body;
  const result = db.prepare(`
    INSERT INTO community_comments (post_id, author_name, content) VALUES (?, ?, ?)
  `).run(req.params.id, author_name, content);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/announcements', (req, res) => {
  const announcements = db.prepare(`
    SELECT * FROM announcements WHERE active = 1 AND (expires_at IS NULL OR expires_at >= date('now'))
    ORDER BY priority DESC, created_at DESC
  `).all();
  res.json(announcements);
});

router.post('/announcements', (req, res) => {
  const { title, content, priority, author, expires_at } = req.body;
  const result = db.prepare(`
    INSERT INTO announcements (title, content, priority, author, expires_at) VALUES (?, ?, ?, ?, ?)
  `).run(title, content, priority || 'normal', author, expires_at);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/announcements/:id', (req, res) => {
  db.prepare(`UPDATE announcements SET active = 0 WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

export default router;
