import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { TrendingUp, AlertTriangle, Gift, ArrowUpCircle, Users, Target, DollarSign, Phone } from 'lucide-react';

const MONTH_NAMES = { '01':'ינו','02':'פבר','03':'מרץ','04':'אפר','05':'מאי','06':'יוני','07':'יולי','08':'אוג','09':'ספט','10':'אוק','11':'נוב','12':'דצמ' };

function fmt(n) { return `₪${Number(n||0).toLocaleString('he-IL')}`; }

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-r-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">{value}</div>
          <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
        </div>
        <Icon size={26} className="text-slate-300 mt-1" />
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}

function FunnelView({ funnel }) {
  if (!funnel?.length) return null;
  const max = funnel[0].count || 1;
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h4 className="font-medium text-slate-700 mb-4">משפך המרה</h4>
      <div className="space-y-2">
        {funnel.map((stage, i) => {
          const pct = Math.round(stage.count / max * 100);
          const convFrom = i > 0 && funnel[i-1].count > 0 ? Math.round(stage.count / funnel[i-1].count * 100) : null;
          return (
            <div key={stage.stage}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700 font-medium">{stage.stage}</span>
                <div className="flex items-center gap-3">
                  {convFrom !== null && <span className="text-xs text-slate-400">← {convFrom}% המרה</span>}
                  <span className="font-bold">{stage.count}</span>
                </div>
              </div>
              <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                <div className="h-full rounded-lg transition-all duration-500 flex items-center pr-3"
                  style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: stage.color }}>
                  {pct > 15 && <span className="text-white text-xs font-medium">{pct}%</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AtRiskTab({ data }) {
  if (!data) return <div className="text-center py-12 text-slate-400">טוען...</div>;
  const all = [...(data.expired || []), ...(data.expiring || [])];

  if (all.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <div className="text-green-500 text-5xl mb-3">✓</div>
      <div className="text-green-700 font-medium">כל החברים פעילים!</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {all.map(m => (
        <div key={m.id} className={`bg-white rounded-xl shadow-sm p-4 flex items-center justify-between ${m.risk_type === 'expired' ? 'border-r-4 border-red-500' : 'border-r-4 border-orange-400'}`}>
          <div>
            <div className="font-medium text-slate-800">{m.name}</div>
            <div className="text-sm text-slate-500">{m.phone} · {m.total_flights} טיסות</div>
            <div className={`text-xs mt-1 font-medium ${m.risk_type === 'expired' ? 'text-red-600' : 'text-orange-600'}`}>
              {m.risk_type === 'expired' ? `פגה לפני ${Math.abs(m.days_left)} ימים` : `פגה בעוד ${m.days_left} ימים`}
            </div>
          </div>
          <div className="flex gap-2">
            {m.phone && (
              <a href={`https://wa.me/972${m.phone.replace(/\D/g,'').replace(/^0/,'')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Phone size={12} /> וואטסאפ
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function UpsellTab({ data }) {
  if (!data) return <div className="text-center py-12 text-slate-400">טוען...</div>;
  const all = [
    ...(data.p1ToP2 || []).map(x => ({ ...x, category: 'שדרוג קורס' })),
    ...(data.flightToStudent || []).map(x => ({ ...x, category: 'טיסת חוויה → קורס' })),
    ...(data.toPremiuM || []).map(x => ({ ...x, category: 'שדרוג חברות' })),
  ];

  if (all.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <div className="text-slate-400">אין הזדמנויות upsell כרגע</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {all.map((item, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border-r-4 border-sky-500">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{item.category}</span>
            </div>
            <div className="font-medium text-slate-800">{item.name}</div>
            <div className="text-sm text-slate-500">{item.phone}</div>
            <div className="text-xs text-sky-700 mt-1">הצעה: <strong>{item.suggested_course || item.suggested_upgrade}</strong> — {item.reason}</div>
          </div>
          {item.phone && (
            <a href={`https://wa.me/972${item.phone.replace(/\D/g,'').replace(/^0/,'')}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
              <Phone size={12} /> שלח הצעה
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function BirthdaysTab({ data }) {
  if (!data) return <div className="text-center py-12 text-slate-400">טוען...</div>;
  if (data.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <div className="text-slate-400">אין ימי הולדת בשבועיים הקרובים</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {data.map((person, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border-r-4 border-pink-400">
          <div>
            <div className="font-medium text-slate-800">{person.name}
              {person.days_until === 0 && <span className="mr-2 text-pink-600 font-bold">🎂 היום!</span>}
            </div>
            <div className="text-sm text-slate-500">{person.phone} · {person.type === 'student' ? 'תלמיד' : 'חבר'}</div>
            <div className="text-xs text-pink-600 mt-1">
              {person.days_until === 0 ? 'יום הולדת היום!' : `יום הולדת בעוד ${person.days_until} ימים`} · {person.birthday_md?.split('-').reverse().join('/')}
            </div>
          </div>
          {person.phone && (
            <a href={`https://wa.me/972${person.phone.replace(/\D/g,'').replace(/^0/,'')}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
              <Gift size={12} /> ברך
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function LTVTab({ data }) {
  if (!data) return <div className="text-center py-12 text-slate-400">טוען...</div>;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-medium text-slate-700 mb-3">שווי לקוח לפי סוג חברות</h4>
          <div className="space-y-3 text-sm">
            {(data.byType || []).map(row => (
              <div key={row.membership_type} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <div className="font-medium">{row.membership_type}</div>
                  <div className="text-slate-400">{row.count} חברים · {Math.round(row.avg_flights)} טיסות בממוצע</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-medium text-slate-700 mb-3">ממוצע תשלומים לפי סוג</h4>
          <div className="space-y-3 text-sm">
            {(data.avgPayment || []).map(row => (
              <div key={row.payer_type} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <div className="font-medium">{row.payer_type === 'student' ? 'תלמיד' : 'חבר'}</div>
                  <div className="text-slate-400">{row.count} תשלומים</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">{fmt(row.avg)} ממוצע</div>
                  <div className="text-xs text-slate-400">{fmt(row.total)} סה"כ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h4 className="font-medium text-slate-700 mb-3">משלמים מובילים</h4>
        <div className="space-y-2 text-sm">
          {(data.topPayers || []).map((p, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-5">{i + 1}.</span>
                <span className="font-medium">{p.payer_name}</span>
                <span className="text-xs text-slate-400">{p.payments} תשלומים</span>
              </div>
              <span className="font-bold text-sky-700">{fmt(p.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Growth() {
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [atRisk, setAtRisk] = useState(null);
  const [upsell, setUpsell] = useState(null);
  const [birthdays, setBirthdays] = useState(null);
  const [ltv, setLtv] = useState(null);

  useEffect(() => {
    api.get('/growth/dashboard').then(setDashboard);
    api.get('/growth/funnel').then(setFunnel);
  }, []);

  useEffect(() => {
    if (tab === 'atrisk' && !atRisk) api.get('/growth/at-risk').then(setAtRisk);
    if (tab === 'upsell' && !upsell) api.get('/growth/upsell').then(setUpsell);
    if (tab === 'birthdays' && !birthdays) api.get('/growth/birthdays').then(setBirthdays);
    if (tab === 'ltv' && !ltv) api.get('/growth/ltv').then(setLtv);
  }, [tab]);

  const monthlyData = (dashboard?.monthly_growth || []).map(m => ({
    name: MONTH_NAMES[m.month?.slice(5)] || m.month?.slice(5),
    חברים: m.members,
    תלמידים: m.students,
    לידים: m.leads,
  }));

  const growth = dashboard ? dashboard.new_members_this_month - dashboard.new_members_last_month : 0;

  return (
    <div className="p-6 animate-fade-in" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">מנוע צמיחה</h1>
        <p className="text-slate-500 text-sm">המרה, שימור, upsell ואנליטיקה</p>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="חברים פעילים" value={dashboard.active_members} sub={`${growth >= 0 ? '+' : ''}${growth} מהחודש שעבר`} color="border-green-500" icon={Users} />
          <StatCard label="שיעור המרה" value={`${dashboard.conversion_rate}%`} sub={`${dashboard.converted_leads}/${dashboard.total_leads} לידים`} color="border-sky-500" icon={Target} />
          <StatCard label="בסיכון" value={dashboard.at_risk_count} sub="חברות פגה/פגה בקרוב" color="border-orange-500" icon={AlertTriangle} />
          <StatCard label="הזדמנויות Upsell" value={dashboard.upsell_count} sub="לקוחות לשדרוג" color="border-purple-500" icon={ArrowUpCircle} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-medium text-slate-700 mb-3">צמיחה חודשית — 12 חודשים</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="חברים" fill="#22c55e" radius={[2,2,0,0]} />
              <Bar dataKey="תלמידים" fill="#6366f1" radius={[2,2,0,0]} />
              <Bar dataKey="לידים" fill="#f59e0b" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <FunnelView funnel={funnel} />
      </div>

      <div className="flex border-b mb-6 overflow-x-auto">
        <TabBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>סקירה</TabBtn>
        <TabBtn active={tab === 'atrisk'} onClick={() => setTab('atrisk')}>
          בסיכון {dashboard?.at_risk_count > 0 && <span className="mr-1 bg-orange-500 text-white text-xs rounded-full px-1.5">{dashboard.at_risk_count}</span>}
        </TabBtn>
        <TabBtn active={tab === 'upsell'} onClick={() => setTab('upsell')}>Upsell</TabBtn>
        <TabBtn active={tab === 'birthdays'} onClick={() => setTab('birthdays')}>ימי הולדת</TabBtn>
        <TabBtn active={tab === 'ltv'} onClick={() => setTab('ltv')}>LTV</TabBtn>
      </div>

      {tab === 'dashboard' && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-medium text-slate-700 mb-4">סטטיסטיקות</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">חברים חדשים החודש</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{dashboard?.new_members_this_month}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">תלמידים חדשים החודש</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{dashboard?.new_students_this_month}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">סה"כ לידים</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{dashboard?.total_leads}</div>
            </div>
          </div>
        </div>
      )}
      {tab === 'atrisk' && <AtRiskTab data={atRisk} />}
      {tab === 'upsell' && <UpsellTab data={upsell} />}
      {tab === 'birthdays' && <BirthdaysTab data={birthdays} />}
      {tab === 'ltv' && <LTVTab data={ltv} />}
    </div>
  );
}
