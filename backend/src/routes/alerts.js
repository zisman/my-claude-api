import { Router } from 'express';
import db from '../database.js';
import { runAllAlerts, checkInspectionAlerts, checkLoanAlerts, checkMedicalAlerts } from '../services/alerts.js';

const router = Router();

// הגדרות התראות
router.get('/settings', (req, res) => {
  const settings = db.prepare(`SELECT * FROM alert_settings ORDER BY alert_type`).all();
  res.json(settings);
});

router.put('/settings/:type', (req, res) => {
  const { warning_days, urgent_days, email_enabled, whatsapp_enabled, active } = req.body;
  db.prepare(`
    UPDATE alert_settings SET
      warning_days=?, urgent_days=?, email_enabled=?, whatsapp_enabled=?, active=?
    WHERE alert_type=?
  `).run(warning_days, urgent_days, email_enabled ? 1 : 0, whatsapp_enabled ? 1 : 0, active ? 1 : 0, req.params.type);
  res.json({ success: true });
});

// הפעלה ידנית
router.post('/run', async (req, res) => {
  try {
    const result = await runAllAlerts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/run/inspections', async (req, res) => {
  try {
    const result = await checkInspectionAlerts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/run/loans', async (req, res) => {
  try {
    const result = await checkLoanAlerts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/run/medical', async (req, res) => {
  try {
    const result = await checkMedicalAlerts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// לוג התראות
router.get('/log', (req, res) => {
  const limit = req.query.limit || 50;
  const log = db.prepare(`
    SELECT al.*, e.name as equipment_name
    FROM alert_log al
    LEFT JOIN equipment e ON al.equipment_id = e.id
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(log);
});

// סטטוס התראות נוכחי (ללא שליחה)
router.get('/status', (req, res) => {
  const warningDays = parseInt(process.env.ALERT_WARNING_DAYS) || 30;
  const urgentDays = parseInt(process.env.ALERT_URGENT_DAYS) || 7;

  const status = {
    equipment: {
      overdue: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE next_inspection < date('now') AND status != 'retired'`).get().c,
      urgent: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE next_inspection BETWEEN date('now') AND date('now', '+' || ? || ' days') AND status != 'retired'`).get(urgentDays).c,
      warning: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE next_inspection BETWEEN date('now', '+' || ? || ' days') AND date('now', '+' || ? || ' days') AND status != 'retired'`).get(urgentDays + 1, warningDays).c,
    },
    loans: {
      overdue: db.prepare(`SELECT COUNT(*) as c FROM equipment_loans WHERE status='active' AND expected_return < date('now')`).get().c,
    },
    medical: {
      expiring: db.prepare(`SELECT COUNT(*) as c FROM students WHERE medical_clearance=1 AND medical_expiry IS NOT NULL AND medical_expiry <= date('now', '+60 days') AND status='active'`).get().c,
    },
    last_run: db.prepare(`SELECT created_at FROM alert_log ORDER BY created_at DESC LIMIT 1`).get()?.created_at || null
  };
  res.json(status);
});

export default router;
