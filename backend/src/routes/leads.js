import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const leads = db.prepare(`
    SELECT l.*, c.name as campaign_name FROM leads l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    ORDER BY l.created_at DESC
  `).all();
  res.json(leads);
});

router.post('/', (req, res) => {
  const { name, phone, email, source, campaign_id, status, interest, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO leads (name, phone, email, source, campaign_id, status, interest, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, email, source, campaign_id, status || 'new', interest, notes);
  if (campaign_id) {
    db.prepare(`UPDATE campaigns SET leads_generated = leads_generated + 1 WHERE id = ?`).run(campaign_id);
  }
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, phone, email, source, status, interest, notes } = req.body;
  db.prepare(`
    UPDATE leads SET name=?, phone=?, email=?, source=?, status=?, interest=?, notes=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, phone, email, source, status, interest, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM leads WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.get('/campaigns', (req, res) => {
  const campaigns = db.prepare(`SELECT * FROM campaigns ORDER BY created_at DESC`).all();
  res.json(campaigns);
});

router.post('/campaigns', (req, res) => {
  const { name, type, budget, start_date, end_date, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO campaigns (name, type, budget, start_date, end_date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, type, budget, start_date, end_date, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/campaigns/:id', (req, res) => {
  const { name, type, budget, spent, status, leads_generated, conversions, notes } = req.body;
  db.prepare(`
    UPDATE campaigns SET name=?, type=?, budget=?, spent=?, status=?, leads_generated=?, conversions=?, notes=?
    WHERE id=?
  `).run(name, type, budget, spent, status, leads_generated, conversions, notes, req.params.id);
  res.json({ success: true });
});

export default router;
