import cron from 'node-cron';
import { runAllAlerts } from './alerts.js';

export function startScheduler() {
  // כל יום בשעה 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ משימה מתוזמנת: בדיקת התראות יומית');
    await runAllAlerts();
  }, { timezone: 'Asia/Jerusalem' });

  console.log('📅 Scheduler פעיל — בדיקות יומיות בשעה 08:00');
}
