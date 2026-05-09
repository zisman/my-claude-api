import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Users, GraduationCap, Wind, Package, Megaphone, Wrench, Calendar, MessageCircle } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setStats).catch(console.error);
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">לוח בקרה</h1>
        <p className="text-slate-500 text-sm">ברוכים הבאים למערכת ניהול מועדון מצנחי רחיפה</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="לקוחות פעילים" value={stats.customers} color="bg-blue-500" />
        <StatCard icon={GraduationCap} label="תלמידים" value={stats.students} color="bg-purple-500" />
        <StatCard icon={Wind} label="טיסות קרובות" value={stats.upcoming_flights} color="bg-sky-500" />
        <StatCard icon={Package} label="פריטי ציוד" value={stats.equipment} color="bg-green-500" />
        <StatCard icon={Megaphone} label="לידים פעילים" value={stats.active_leads} color="bg-orange-500" />
        <StatCard icon={Wrench} label="תחזוקה ממתינה" value={stats.pending_maintenance} color="bg-red-500" />
        <StatCard icon={Calendar} label="אירועים קרובים" value={stats.upcoming_events} color="bg-teal-500" />
        <StatCard icon={MessageCircle} label="פוסטים בקהילה" value={stats.community_posts} color="bg-indigo-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-3">טיסות חוויה אחרונות</h2>
          <div className="space-y-2">
            {stats.recent_flights.map(f => (
              <div key={f.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="font-medium text-sm">{f.customer_name}</div>
                  <div className="text-xs text-slate-500">{f.flight_date} • {f.location}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  f.status === 'completed' ? 'bg-green-100 text-green-700' :
                  f.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {f.status === 'completed' ? 'הושלם' : f.status === 'confirmed' ? 'מאושר' : 'ממתין'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-3">אירועים קרובים</h2>
          <div className="space-y-2">
            {stats.upcoming_events_list.map(e => (
              <div key={e.id} className="py-2 border-b border-slate-100 last:border-0">
                <div className="font-medium text-sm">{e.name}</div>
                <div className="text-xs text-slate-500">{e.event_date} • {e.location}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.maintenance_alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="font-bold text-red-700 mb-3">התראות תחזוקה</h2>
          <div className="space-y-2">
            {stats.maintenance_alerts.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-700">{item.name} - {item.maintenance_type}</span>
                <span className="text-red-600 font-medium">{item.next_due}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
