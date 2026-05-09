import { Router } from 'express';
import db from '../database.js';
import { analyzeMaintenanceForecast } from '../services/claude.js';

const router = Router();

router.get('/', (req, res) => {
  const records = db.prepare(`
    SELECT mr.*, e.name as equipment_name, e.type as equipment_type
    FROM maintenance_records mr
    JOIN equipment e ON mr.equipment_id = e.id
    ORDER BY mr.performed_date DESC
  `).all();
  res.json(records);
});

router.get('/forecasts', (req, res) => {
  const forecasts = db.prepare(`
    SELECT mf.*, e.name as equipment_name, e.type as equipment_type, e.brand, e.model
    FROM maintenance_forecasts mf
    JOIN equipment e ON mf.equipment_id = e.id
    WHERE mf.status = 'pending'
    ORDER BY mf.predicted_date
  `).all();
  res.json(forecasts);
});

router.post('/forecast/:equipmentId', async (req, res) => {
  const equipment = db.prepare(`SELECT * FROM equipment WHERE id = ?`).get(req.params.equipmentId);
  if (!equipment) return res.status(404).json({ error: 'ציוד לא נמצא' });

  try {
    const forecast = await analyzeMaintenanceForecast(equipment);

    db.prepare(`DELETE FROM maintenance_forecasts WHERE equipment_id = ? AND status = 'pending'`).run(equipment.id);

    if (forecast.immediate_actions) {
      for (const action of forecast.immediate_actions) {
        db.prepare(`
          INSERT INTO maintenance_forecasts (equipment_id, forecast_type, priority, estimated_cost, description, ai_reasoning)
          VALUES (?, 'immediate', ?, ?, ?, ?)
        `).run(equipment.id, action.priority, action.estimated_cost, action.action, action.reason);
      }
    }

    if (forecast.upcoming_maintenance) {
      for (const item of forecast.upcoming_maintenance) {
        db.prepare(`
          INSERT INTO maintenance_forecasts (equipment_id, forecast_type, predicted_date, estimated_cost, description)
          VALUES (?, 'scheduled', ?, ?, ?)
        `).run(equipment.id, item.due_date, item.estimated_cost, item.action);
      }
    }

    if (forecast.replacement_forecast?.item) {
      db.prepare(`
        INSERT INTO maintenance_forecasts (equipment_id, forecast_type, predicted_date, estimated_cost, description, ai_reasoning)
        VALUES (?, 'replacement', ?, ?, ?, ?)
      `).run(equipment.id, forecast.replacement_forecast.expected_date, forecast.replacement_forecast.estimated_cost,
        forecast.replacement_forecast.item, forecast.replacement_forecast.reason);
    }

    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/forecasts/:id', (req, res) => {
  const { status } = req.body;
  db.prepare(`UPDATE maintenance_forecasts SET status=? WHERE id=?`).run(status, req.params.id);
  res.json({ success: true });
});

router.get('/upcoming', (req, res) => {
  const upcoming = db.prepare(`
    SELECT e.*, mr.next_due, mr.type as maintenance_type
    FROM equipment e
    LEFT JOIN maintenance_records mr ON e.id = mr.equipment_id
    WHERE mr.next_due IS NOT NULL AND mr.next_due <= date('now', '+60 days')
    ORDER BY mr.next_due
  `).all();
  res.json(upcoming);
});

export default router;
