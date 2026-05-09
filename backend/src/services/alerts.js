import nodemailer from 'nodemailer';
import db from '../database.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return { skipped: true };
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    return { success: true };
  } catch (err) {
    console.error('שגיאת אימייל:', err.message);
    return { error: err.message };
  }
}

async function sendWhatsApp(phone, message) {
  if (!process.env.WHATSAPP_API_URL || !phone) return { skipped: true };
  try {
    const res = await fetch(process.env.WHATSAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    });
    return { success: res.ok };
  } catch (err) {
    return { error: err.message };
  }
}

function logAlert(type, equipmentId, message, channel, sentTo, status) {
  db.prepare(`
    INSERT INTO alert_log (alert_type, equipment_id, message, channel, sent_to, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type, equipmentId, message, channel, sentTo, status);
}

function buildEquipmentAlertHtml(items, title, color) {
  const rows = items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.type_label}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.owner_name || 'מועדון'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:${color};font-weight:bold">${item.date_info}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.days_label}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,sans-serif;direction:rtl;max-width:600px;margin:0 auto">
      <div style="background:${color};color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">🪂 מועדון מצנחי רחיפה</h2>
        <h3 style="margin:8px 0 0">${title}</h3>
      </div>
      <div style="background:#f9f9f9;padding:20px;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f0f0f0">
              <th style="padding:10px;text-align:right">שם הציוד</th>
              <th style="padding:10px;text-align:right">סוג</th>
              <th style="padding:10px;text-align:right">בעלים</th>
              <th style="padding:10px;text-align:right">תאריך</th>
              <th style="padding:10px;text-align:right">סטטוס</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;color:#666;font-size:14px">
          נשלח אוטומטית ממערכת ניהול מועדון מצנחי רחיפה
        </p>
      </div>
    </div>
  `;
}

const TYPE_LABELS = {
  wing: 'כנף', harness: 'רתמה', reserve: 'מצנח חירום',
  radio: 'רדיו', helmet: 'קסדה', gps: 'GPS', other: 'אחר'
};

export async function checkInspectionAlerts() {
  const settings = db.prepare(`SELECT * FROM alert_settings WHERE alert_type = 'inspection_due' AND active = 1`).get();
  if (!settings) return;

  const warningDays = settings.warning_days || parseInt(process.env.ALERT_WARNING_DAYS) || 30;
  const urgentDays = settings.urgent_days || parseInt(process.env.ALERT_URGENT_DAYS) || 7;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminWhatsApp = process.env.ADMIN_WHATSAPP;

  // ציוד שעבר את תאריך הבדיקה
  const overdue = db.prepare(`
    SELECT * FROM equipment
    WHERE next_inspection < date('now') AND status = 'active'
  `).all();

  // ציוד שמתקרב לבדיקה דחוף
  const urgent = db.prepare(`
    SELECT *, CAST(julianday(next_inspection) - julianday('now') AS INTEGER) as days_left
    FROM equipment
    WHERE next_inspection BETWEEN date('now') AND date('now', '+' || ? || ' days')
    AND status = 'active'
  `).all(urgentDays);

  // ציוד שמתקרב לבדיקה - התראה ראשונה
  const warning = db.prepare(`
    SELECT *, CAST(julianday(next_inspection) - julianday('now') AS INTEGER) as days_left
    FROM equipment
    WHERE next_inspection BETWEEN date('now', '+' || ? || ' days') AND date('now', '+' || ? || ' days')
    AND status = 'active'
  `).all(urgentDays + 1, warningDays);

  const results = [];

  if (overdue.length > 0) {
    const items = overdue.map(e => ({
      name: e.name,
      type_label: TYPE_LABELS[e.type] || e.type,
      owner_name: e.owner_name,
      date_info: e.next_inspection,
      days_label: '🔴 פג תוקף!'
    }));
    const html = buildEquipmentAlertHtml(items, '🚨 ציוד שעבר תאריך בדיקה!', '#dc2626');
    const subject = `🚨 דחוף: ${overdue.length} פריטי ציוד עברו תאריך בדיקה`;

    if (adminEmail && settings.email_enabled) {
      const r = await sendEmail(adminEmail, subject, html);
      overdue.forEach(e => logAlert('inspection_overdue', e.id, subject, 'email', adminEmail, r.error ? 'failed' : 'sent'));
      results.push({ type: 'overdue_email', count: overdue.length, ...r });
    }

    if (adminWhatsApp && settings.whatsapp_enabled) {
      const msg = `🚨 *מועדון מצנחי רחיפה — התראת בטיחות*\n\n${overdue.length} פריטי ציוד עברו תאריך בדיקה:\n${overdue.map(e => `• ${e.name}: ${e.next_inspection}`).join('\n')}\n\nיש לטפל מיידית!`;
      const r = await sendWhatsApp(adminWhatsApp, msg);
      results.push({ type: 'overdue_whatsapp', count: overdue.length, ...r });
    }
  }

  if (urgent.length > 0) {
    const items = urgent.map(e => ({
      name: e.name,
      type_label: TYPE_LABELS[e.type] || e.type,
      owner_name: e.owner_name,
      date_info: e.next_inspection,
      days_label: `⚠️ בעוד ${e.days_left} ימים`
    }));
    const html = buildEquipmentAlertHtml(items, `⚠️ ציוד לבדיקה בעוד ${urgentDays} ימים`, '#d97706');
    const subject = `⚠️ תזכורת: ${urgent.length} פריטי ציוד לבדיקה בקרוב`;

    if (adminEmail && settings.email_enabled) {
      const r = await sendEmail(adminEmail, subject, html);
      results.push({ type: 'urgent_email', count: urgent.length, ...r });
    }

    if (adminWhatsApp && settings.whatsapp_enabled) {
      const msg = `⚠️ *מועדון מצנחי רחיפה — תזכורת בדיקת ציוד*\n\n${urgent.length} פריטים לבדיקה בקרוב:\n${urgent.map(e => `• ${e.name}: ${e.next_inspection} (${e.days_left} ימים)`).join('\n')}`;
      const r = await sendWhatsApp(adminWhatsApp, msg);
      results.push({ type: 'urgent_whatsapp', count: urgent.length, ...r });
    }
  }

  if (warning.length > 0) {
    const items = warning.map(e => ({
      name: e.name,
      type_label: TYPE_LABELS[e.type] || e.type,
      owner_name: e.owner_name,
      date_info: e.next_inspection,
      days_label: `📅 בעוד ${e.days_left} ימים`
    }));
    const html = buildEquipmentAlertHtml(items, `📅 ציוד לבדיקה בחודש הקרוב`, '#2563eb');
    const subject = `📅 תזכורת: ${warning.length} פריטי ציוד לבדיקה ב-${warningDays} ימים הקרובים`;

    if (adminEmail && settings.email_enabled) {
      const r = await sendEmail(adminEmail, subject, html);
      results.push({ type: 'warning_email', count: warning.length, ...r });
    }
  }

  return { overdue: overdue.length, urgent: urgent.length, warning: warning.length, results };
}

export async function checkLoanAlerts() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const overdue = db.prepare(`
    SELECT el.*, e.name as equipment_name
    FROM equipment_loans el
    JOIN equipment e ON el.equipment_id = e.id
    WHERE el.status = 'active'
    AND el.expected_return < date('now')
  `).all();

  if (overdue.length > 0 && adminEmail) {
    const list = overdue.map(l => `• ${l.equipment_name} — אצל ${l.borrower_name} מאז ${l.loan_date} (היה לחזור: ${l.expected_return})`).join('\n');
    const subject = `📦 ${overdue.length} פריטי ציוד לא הוחזרו בזמן`;
    const html = `<div dir="rtl" style="font-family:Arial"><h2>📦 ציוד שלא הוחזר בזמן</h2><pre>${list}</pre></div>`;
    await sendEmail(adminEmail, subject, html);
    overdue.forEach(l => logAlert('loan_overdue', l.equipment_id, subject, 'email', adminEmail, 'sent'));
  }

  return { overdue: overdue.length };
}

export async function checkMedicalAlerts() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const expiring = db.prepare(`
    SELECT name, phone, medical_expiry,
    CAST(julianday(medical_expiry) - julianday('now') AS INTEGER) as days_left
    FROM students
    WHERE medical_clearance = 1
    AND medical_expiry IS NOT NULL
    AND medical_expiry <= date('now', '+60 days')
    AND status = 'active'
    ORDER BY medical_expiry
  `).all();

  if (expiring.length > 0 && adminEmail) {
    const list = expiring.map(s =>
      `• ${s.name}: ${s.medical_expiry} (${s.days_left > 0 ? `בעוד ${s.days_left} ימים` : 'פג תוקף!'})`
    ).join('\n');
    const subject = `🏥 ${expiring.length} תלמידים עם אישור רפואי שפג/פג בקרוב`;
    const html = `<div dir="rtl" style="font-family:Arial"><h2>🏥 אישורים רפואיים לחידוש</h2><pre>${list}</pre></div>`;
    await sendEmail(adminEmail, subject, html);
  }

  return { expiring: expiring.length };
}

export async function runAllAlerts() {
  console.log('🔔 מריץ בדיקת התראות...');
  const inspection = await checkInspectionAlerts();
  const loans = await checkLoanAlerts();
  const medical = await checkMedicalAlerts();
  console.log('✅ התראות הושלמו:', { inspection, loans, medical });
  return { inspection, loans, medical };
}
