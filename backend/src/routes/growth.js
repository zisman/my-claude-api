import { Router } from 'express';
import db from '../database.js';

const router = Router();

// לוח בקרה ראשי
router.get('/dashboard', (req, res) => {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1).toISOString().slice(0, 7);

  const data = {
    new_members_this_month: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE join_date LIKE ?`).get(`${thisMonth}%`).c,
    new_members_last_month: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE join_date LIKE ?`).get(`${lastMonth}%`).c,
    new_students_this_month: db.prepare(`SELECT COUNT(*) as c FROM students WHERE enrollment_date LIKE ?`).get(`${thisMonth}%`).c,
    active_members: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE status='active'`).get().c,
    total_leads: db.prepare(`SELECT COUNT(*) as c FROM leads`).get().c,
    converted_leads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status='converted'`).get().c,
    at_risk_count: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE membership_expiry <= date('now','+30 days') AND membership_expiry >= date('now') AND status='active'`).get().c,
    upsell_count: 0,
    conversion_rate: 0,
    monthly_growth: [],
  };

  data.conversion_rate = data.total_leads > 0 ? Math.round(data.converted_leads / data.total_leads * 100) : 0;

  // צמיחה חודשית - 12 חודשים אחרונים
  data.monthly_growth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i));
    const ms = d.toISOString().slice(0, 7);
    return {
      month: ms,
      members: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE join_date LIKE ?`).get(`${ms}%`).c,
      students: db.prepare(`SELECT COUNT(*) as c FROM students WHERE enrollment_date LIKE ?`).get(`${ms}%`).c,
      leads: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE created_at LIKE ?`).get(`${ms}%`).c,
    };
  });

  // upsell count
  const p1done = db.prepare(`
    SELECT COUNT(DISTINCT se.student_id) as c FROM student_enrollments se
    JOIN courses c ON se.course_id = c.id WHERE c.level='beginner' AND se.status='active'
  `).get().c;
  data.upsell_count = p1done;

  res.json(data);
});

// משתמשים בסיכון (חברות פגה / לא פעילים)
router.get('/at-risk', (req, res) => {
  const expiring = db.prepare(`
    SELECT id, name, phone, email, membership_type, membership_expiry, total_flights,
      CAST(julianday(membership_expiry) - julianday('now') AS INTEGER) as days_left,
      'expiring' as risk_type
    FROM customers
    WHERE membership_expiry <= date('now','+30 days') AND membership_expiry >= date('now') AND status='active'
    ORDER BY membership_expiry
  `).all();

  const expired = db.prepare(`
    SELECT id, name, phone, email, membership_type, membership_expiry, total_flights,
      CAST(julianday(membership_expiry) - julianday('now') AS INTEGER) as days_left,
      'expired' as risk_type
    FROM customers
    WHERE membership_expiry < date('now') AND status='active'
    ORDER BY membership_expiry DESC
  `).all();

  res.json({ expiring, expired });
});

// הזדמנויות upsell
router.get('/upsell', (req, res) => {
  // תלמידים שסיימו P1 ולא רשומים ל-P2
  const p1ToP2 = db.prepare(`
    SELECT s.id, s.name, s.phone, s.email, s.current_level, s.instructor,
      c.name as completed_course, 'P2' as suggested_course,
      'קורס P2 - המשך טבעי לאחר P1' as reason
    FROM students s
    JOIN student_enrollments se ON s.id = se.student_id
    JOIN courses c ON se.course_id = c.id
    WHERE c.level = 'beginner' AND se.status = 'active'
    AND s.id NOT IN (
      SELECT se2.student_id FROM student_enrollments se2
      JOIN courses c2 ON se2.course_id = c2.id WHERE c2.level = 'intermediate'
    )
    GROUP BY s.id
  `).all();

  // חברים שרכשו טיסת חוויה ולא הפכו לתלמידים
  const flightToStudent = db.prepare(`
    SELECT DISTINCT ef.customer_name as name, ef.customer_phone as phone,
      ef.flight_date, 'קורס P1' as suggested_course,
      'טס טיסת חוויה - מועמד אידיאלי לקורס' as reason
    FROM experience_flights ef
    WHERE ef.status = 'completed'
    AND ef.customer_phone NOT IN (SELECT phone FROM students WHERE phone IS NOT NULL)
    AND ef.customer_phone NOT IN (SELECT phone FROM customers WHERE phone IS NOT NULL)
    LIMIT 10
  `).all();

  // חברי regular שיכולים לשדרג לפרמיום
  const toPremiuM = db.prepare(`
    SELECT id, name, phone, total_flights, membership_type,
      'premium' as suggested_upgrade,
      'מעל 50 טיסות - מתאים לחברות פרמיום' as reason
    FROM customers
    WHERE membership_type = 'regular' AND total_flights >= 50 AND status = 'active'
  `).all();

  res.json({ p1ToP2, flightToStudent, toPremiuM });
});

// ימי הולדת קרובים
router.get('/birthdays', (req, res) => {
  const days = parseInt(req.query.days) || 14;

  const membersBirthdays = db.prepare(`
    SELECT id, name, phone, email, 'member' as type,
      birth_date,
      strftime('%m-%d', birth_date) as birthday_md,
      CAST(
        (julianday(strftime('%Y', 'now') || '-' || strftime('%m-%d', birth_date)) - julianday('now') +
        CASE WHEN strftime('%m-%d', birth_date) < strftime('%m-%d', 'now') THEN 365 ELSE 0 END)
      AS INTEGER) as days_until
    FROM customers
    WHERE birth_date IS NOT NULL AND status='active'
    HAVING days_until BETWEEN 0 AND ?
    ORDER BY days_until
  `).all(days);

  const studentBirthdays = db.prepare(`
    SELECT id, name, phone, email, 'student' as type,
      birth_date,
      strftime('%m-%d', birth_date) as birthday_md,
      CAST(
        (julianday(strftime('%Y', 'now') || '-' || strftime('%m-%d', birth_date)) - julianday('now') +
        CASE WHEN strftime('%m-%d', birth_date) < strftime('%m-%d', 'now') THEN 365 ELSE 0 END)
      AS INTEGER) as days_until
    FROM students
    WHERE birth_date IS NOT NULL AND status='active'
    HAVING days_until BETWEEN 0 AND ?
    ORDER BY days_until
  `).all(days);

  res.json([...membersBirthdays, ...studentBirthdays].sort((a, b) => a.days_until - b.days_until));
});

// משפך המרה
router.get('/funnel', (req, res) => {
  const funnel = [
    { stage: 'לידים', count: db.prepare(`SELECT COUNT(*) as c FROM leads`).get().c, color: '#6366f1' },
    { stage: 'יצרנו קשר', count: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status IN ('contacted','interested','qualified','converted')`).get().c, color: '#8b5cf6' },
    { stage: 'מתעניינים', count: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status IN ('interested','qualified','converted')`).get().c, color: '#a855f7' },
    { stage: 'טיסת חוויה', count: db.prepare(`SELECT COUNT(*) as c FROM experience_flights WHERE status='completed'`).get().c, color: '#ec4899' },
    { stage: 'נרשמו לקורס', count: db.prepare(`SELECT COUNT(*) as c FROM students`).get().c, color: '#f43f5e' },
    { stage: 'חברי מועדון', count: db.prepare(`SELECT COUNT(*) as c FROM customers WHERE status='active'`).get().c, color: '#22c55e' },
  ];
  res.json(funnel);
});

// LTV - ערך לקוח לאורך זמן
router.get('/ltv', (req, res) => {
  const byType = db.prepare(`
    SELECT membership_type,
      COUNT(*) as count,
      AVG(total_flights) as avg_flights
    FROM customers WHERE status='active' GROUP BY membership_type
  `).all();

  const avgPayment = db.prepare(`
    SELECT payer_type, AVG(amount) as avg, SUM(amount) as total, COUNT(*) as count
    FROM payments WHERE status='paid' AND payer_type IN ('member','student')
    GROUP BY payer_type
  `).all();

  const topPayers = db.prepare(`
    SELECT payer_name, SUM(amount) as total, COUNT(*) as payments
    FROM payments WHERE status='paid' GROUP BY payer_name
    ORDER BY total DESC LIMIT 10
  `).all();

  res.json({ byType, avgPayment, topPayers });
});

// תקשורת — תבניות
router.get('/templates', (req, res) => {
  res.json(db.prepare(`SELECT * FROM communication_templates WHERE active=1 ORDER BY type`).all());
});

// שליחת הודעה לקבוצה
router.post('/broadcast', async (req, res) => {
  const { message, recipients, channel } = req.body;
  // Store log entries
  const sent = [];
  for (const r of (recipients || [])) {
    db.prepare(`INSERT INTO communications_log (recipient_name, recipient_contact, channel, content, status) VALUES (?,?,?,?,'sent')`)
      .run(r.name, r.contact, channel || 'whatsapp', message);
    sent.push(r.name);
  }
  res.json({ sent: sent.length, recipients: sent });
});

// לוג תקשורת
router.get('/communications', (req, res) => {
  const log = db.prepare(`SELECT * FROM communications_log ORDER BY sent_at DESC LIMIT 100`).all();
  res.json(log);
});

export default router;
