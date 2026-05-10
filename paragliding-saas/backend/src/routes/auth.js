import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password, slug } = req.body;
  if (!email || !password || !slug) {
    return res.status(400).json({ error: 'Email, password, and club slug required' });
  }

  const club = db.prepare('SELECT * FROM clubs WHERE slug = ?').get(slug);
  if (!club) return res.status(404).json({ error: 'Club not found' });

  const user = db.prepare('SELECT * FROM users WHERE club_id = ? AND email = ? AND is_active = 1').get(club.id, email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id, clubId: club.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar_url: user.avatar_url },
    club: { id: club.id, name: club.name, slug: club.slug, currency: club.currency, timezone: club.timezone },
  });
});

router.get('/me', authenticate, (req, res) => {
  const { password_hash, ...user } = req.user;
  const club = db.prepare('SELECT id, name, slug, currency, timezone, logo_url FROM clubs WHERE id = ?').get(req.clubId);
  res.json({ user, club });
});

router.put('/me', authenticate, (req, res) => {
  const { name, phone } = req.body;
  db.prepare('UPDATE users SET name = ?, phone = ?, updated_at = datetime("now") WHERE id = ?').run(name, phone, req.user.id);
  res.json({ success: true });
});

router.put('/me/password', authenticate, (req, res) => {
  const { current, next: newPassword } = req.body;
  if (!bcrypt.compareSync(current, req.user.password_hash)) {
    return res.status(400).json({ error: 'Current password incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

export default router;
