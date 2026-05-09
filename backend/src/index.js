import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import customersRouter from './routes/customers.js';
import leadsRouter from './routes/leads.js';
import studentsRouter from './routes/students.js';
import flightsRouter from './routes/flights.js';
import suppliersRouter from './routes/suppliers.js';
import equipmentRouter from './routes/equipment.js';
import maintenanceRouter from './routes/maintenance.js';
import weatherRouter from './routes/weather.js';
import communityRouter from './routes/community.js';
import flightRoutesRouter from './routes/flightroutes.js';
import lessonsRouter from './routes/lessons.js';
import aiRouter from './routes/ai.js';
import alertsRouter from './routes/alerts.js';
import financeRouter from './routes/finance.js';
import growthRouter from './routes/growth.js';
import socialRouter from './routes/social.js';
import db from './database.js';
import { startScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/flights', flightsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/community', communityRouter);
app.use('/api/routes', flightRoutesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/growth', growthRouter);
app.use('/api/social', socialRouter);

app.get('/api/dashboard', (req, res) => {
  const stats = {
    customers: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE status='active'`).get().c,
    students: db.prepare(`SELECT COUNT(*) as c FROM students WHERE status='active'`).get().c,
    upcoming_flights: db.prepare(`SELECT COUNT(*) as c FROM experience_flights WHERE status IN ('pending','confirmed') AND flight_date >= date('now')`).get().c,
    equipment: db.prepare(`SELECT COUNT(*) as c FROM equipment WHERE status='active'`).get().c,
    active_leads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status NOT IN ('converted','lost')`).get().c,
    pending_maintenance: db.prepare(`SELECT COUNT(*) as c FROM maintenance_forecasts WHERE status='pending'`).get().c,
    upcoming_events: db.prepare(`SELECT COUNT(*) as c FROM events WHERE status='upcoming' AND event_date >= date('now')`).get().c,
    community_posts: db.prepare(`SELECT COUNT(*) as c FROM community_posts`).get().c,
    recent_flights: db.prepare(`SELECT * FROM experience_flights ORDER BY created_at DESC LIMIT 5`).all(),
    recent_leads: db.prepare(`SELECT * FROM leads ORDER BY created_at DESC LIMIT 5`).all(),
    upcoming_events_list: db.prepare(`SELECT * FROM events WHERE status='upcoming' AND event_date >= date('now') ORDER BY event_date LIMIT 3`).all(),
    maintenance_alerts: db.prepare(`
      SELECT e.name, e.type, mr.next_due, mr.type as maintenance_type
      FROM equipment e JOIN maintenance_records mr ON e.id = mr.equipment_id
      WHERE mr.next_due <= date('now', '+30 days') AND mr.next_due IS NOT NULL
      ORDER BY mr.next_due LIMIT 5
    `).all()
  };
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`מועדון מצנחי רחיפה - שרת פעיל על פורט ${PORT}`);
  startScheduler();
});
