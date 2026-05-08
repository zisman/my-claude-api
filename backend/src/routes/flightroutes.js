import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const routes = db.prepare(`SELECT * FROM flight_routes ORDER BY rating DESC`).all();
  res.json(routes);
});

router.get('/:id', (req, res) => {
  const route = db.prepare(`SELECT * FROM flight_routes WHERE id = ?`).get(req.params.id);
  if (!route) return res.status(404).json({ error: 'לא נמצא' });
  const reviews = db.prepare(`SELECT * FROM route_reviews WHERE route_id = ? ORDER BY created_at DESC`).all(req.params.id);
  res.json({ ...route, reviews });
});

router.post('/', (req, res) => {
  const { name, description, location, difficulty, distance_km, altitude_gain, max_altitude, min_altitude, waypoints, conditions, best_season, notes, created_by } = req.body;
  const result = db.prepare(`
    INSERT INTO flight_routes (name, description, location, difficulty, distance_km, altitude_gain, max_altitude, min_altitude, waypoints, conditions, best_season, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description, location, difficulty || 'intermediate', distance_km, altitude_gain, max_altitude, min_altitude,
    typeof waypoints === 'object' ? JSON.stringify(waypoints) : waypoints,
    conditions, best_season, notes, created_by);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, description, location, difficulty, distance_km, altitude_gain, max_altitude, min_altitude, conditions, best_season, notes } = req.body;
  db.prepare(`
    UPDATE flight_routes SET name=?, description=?, location=?, difficulty=?, distance_km=?, altitude_gain=?, max_altitude=?, min_altitude=?, conditions=?, best_season=?, notes=?
    WHERE id=?
  `).run(name, description, location, difficulty, distance_km, altitude_gain, max_altitude, min_altitude, conditions, best_season, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM route_reviews WHERE route_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM flight_routes WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/reviews', (req, res) => {
  const { reviewer_name, rating, comment, flight_date, conditions } = req.body;
  const result = db.prepare(`
    INSERT INTO route_reviews (route_id, reviewer_name, rating, comment, flight_date, conditions)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, reviewer_name, rating, comment, flight_date, conditions);

  const avg = db.prepare(`SELECT AVG(rating) as avg, COUNT(*) as cnt FROM route_reviews WHERE route_id = ?`).get(req.params.id);
  db.prepare(`UPDATE flight_routes SET rating = ?, total_reviews = ? WHERE id = ?`).run(
    Math.round(avg.avg * 10) / 10, avg.cnt, req.params.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
