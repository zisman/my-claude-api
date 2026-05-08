import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, TrendingUp, Users, DollarSign, Bot } from 'lucide-react';

const STATUS_LABELS = { new: 'חדש', contacted: 'נוצר קשר', interested: 'מתעניין', qualified: 'מוסמך', converted: 'הומר', lost: 'אבוד' };
const STATUS_COLORS = { new: 'bg-gray-100 text-gray-700', contacted: 'bg-blue-100 text-blue-700', interested: 'bg-yellow-100 text-yellow-700', qualified: 'bg-purple-100 text-purple-700', converted: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700' };

export default function Marketing() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tab, setTab] = useState('leads');
  const [showForm, setShowForm] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', source: '', status: 'new', interest: '' });

  useEffect(() => {
    api.get('/leads').then(setLeads);
    api.get('/leads/campaigns').then(setCampaigns);
  }, []);

  const addLead = async (e) => {
    e.preventDefault();
    await api.post('/leads', form);
    setForm({ name: '', phone: '', email: '', source: '', status: 'new', interest: '' });
    setShowForm(false);
    api.get('/leads').then(setLeads);
  };

  const getInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await api.post('/ai/marketing-insights', {});
      setInsights(data);
    } catch (err) { console.error(err); }
    setLoadingInsights(false);
  };

  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads_generated || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">שיווק ופרסום</h1>
          <p className="text-slate-500 text-sm">ניהול לידים וקמפיינים</p>
        </div>
        <div className="flex gap-2">
          <button onClick={getInsights} disabled={loadingInsights}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50">
            <Bot size={16} />
            {loadingInsights ? 'מנתח...' : 'תובנות AI'}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
            <Plus size={16} /> הוסף ליד
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-2xl font-bold text-slate-800">{leads.length}</div><div className="text-sm text-slate-500">סה"כ לידים</div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-2xl font-bold text-green-600">{totalConversions}</div><div className="text-sm text-slate-500">המרות</div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-2xl font-bold text-blue-600">₪{totalBudget.toLocaleString()}</div><div className="text-sm text-slate-500">תקציב כולל</div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-2xl font-bold text-orange-600">₪{totalSpent.toLocaleString()}</div><div className="text-sm text-slate-500">הוצאות</div></div>
      </div>

      {insights && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2"><Bot size={18} /> תובנות AI</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-purple-700 mb-1">תובנות עיקריות</div>
              <ul className="space-y-1 text-slate-700">
                {insights.insights?.map((ins, i) => <li key={i} className="flex gap-2"><span>•</span><span>{ins}</span></li>)}
              </ul>
            </div>
            <div>
              <div className="font-medium text-purple-700 mb-1">המלצות</div>
              <ul className="space-y-1 text-slate-700">
                {insights.recommendations?.map((rec, i) => <li key={i} className="flex gap-2"><span>•</span><span>{rec}</span></li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-slate-700 mb-4">הוספת ליד חדש</h3>
          <form onSubmit={addLead} className="grid md:grid-cols-3 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם מלא *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="טלפון" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="אימייל" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
              <option value="">מקור</option>
              <option value="facebook">פייסבוק</option>
              <option value="instagram">אינסטגרם</option>
              <option value="google">גוגל</option>
              <option value="referral">המלצה</option>
              <option value="event">אירוע</option>
            </select>
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="תחום עניין" value={form.interest} onChange={e => setForm({...form, interest: e.target.value})} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-sky-600 text-white py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        {['leads', 'campaigns'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'leads' ? 'לידים' : 'קמפיינים'}
          </button>
        ))}
      </div>

      {tab === 'leads' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="text-right px-4 py-3 font-medium text-slate-600">שם</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">טלפון</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">מקור</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">עניין</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
            </tr></thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.source}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.interest}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-800">{c.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {c.status === 'active' ? 'פעיל' : 'הסתיים'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div><div className="font-bold text-slate-800">{c.leads_generated}</div><div className="text-slate-500 text-xs">לידים</div></div>
                <div><div className="font-bold text-green-600">{c.conversions}</div><div className="text-slate-500 text-xs">המרות</div></div>
                <div><div className="font-bold text-blue-600">₪{(c.spent || 0).toLocaleString()}</div><div className="text-slate-500 text-xs">הוצאות</div></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>ניצול תקציב</span>
                  <span>{c.budget ? Math.round((c.spent || 0) / c.budget * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, c.budget ? (c.spent || 0) / c.budget * 100 : 0)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
