import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Wrench, Bot, AlertTriangle, CheckCircle } from 'lucide-react';

const PRIORITY_COLORS = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-yellow-100 text-yellow-700 border-yellow-200', low: 'bg-green-100 text-green-700 border-green-200' };
const PRIORITY_LABELS = { high: 'דחוף', medium: 'בינוני', low: 'נמוך' };
const TYPE_LABELS = { immediate: 'מיידי', scheduled: 'מתוכנן', replacement: 'החלפה' };

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [tab, setTab] = useState('forecasts');
  const [selectedEquip, setSelectedEquip] = useState('');
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [newForecast, setNewForecast] = useState(null);

  useEffect(() => {
    api.get('/maintenance').then(setRecords);
    api.get('/maintenance/forecasts').then(setForecasts);
    api.get('/equipment').then(setEquipment);
  }, []);

  const runForecast = async () => {
    if (!selectedEquip) return;
    setLoadingForecast(true);
    setNewForecast(null);
    try {
      const data = await api.post(`/maintenance/forecast/${selectedEquip}`, {});
      setNewForecast(data);
      api.get('/maintenance/forecasts').then(setForecasts);
    } catch (err) { console.error(err); }
    setLoadingForecast(false);
  };

  const markDone = async (id) => {
    await api.put(`/maintenance/forecasts/${id}`, { status: 'completed' });
    api.get('/maintenance/forecasts').then(setForecasts);
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">תחזוקה</h1>
          <p className="text-slate-500 text-sm">ניהול תחזוקה ותחזיות AI</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-sky-50 border border-purple-200 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2"><Bot size={18} /> תחזית תחזוקה חכמה</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-600 mb-1 block">בחר ציוד לניתוח</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={selectedEquip} onChange={e => setSelectedEquip(e.target.value)}>
              <option value="">-- בחר ציוד --</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.brand} {e.model})</option>
              ))}
            </select>
          </div>
          <button onClick={runForecast} disabled={!selectedEquip || loadingForecast}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm whitespace-nowrap">
            <Bot size={16} />
            {loadingForecast ? 'מנתח...' : 'הרץ תחזית'}
          </button>
        </div>

        {newForecast && (
          <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-slate-700 mb-2">ציון בריאות: <span className={`font-bold ${newForecast.overall_health_score > 70 ? 'text-green-600' : newForecast.overall_health_score > 40 ? 'text-yellow-600' : 'text-red-600'}`}>{newForecast.overall_health_score}/100</span></div>
              {newForecast.safety_concerns?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="font-medium text-red-700 mb-1 flex items-center gap-1"><AlertTriangle size={14} /> חששות בטיחות</div>
                  <ul className="text-red-600 space-y-0.5">{newForecast.safety_concerns.map((c, i) => <li key={i}>• {c}</li>)}</ul>
                </div>
              )}
            </div>
            <div>
              {newForecast.immediate_actions?.length > 0 && (
                <div>
                  <div className="font-medium text-slate-700 mb-1">פעולות מיידיות</div>
                  {newForecast.immediate_actions.map((a, i) => (
                    <div key={i} className={`text-xs border rounded p-2 mb-1 ${PRIORITY_COLORS[a.priority] || ''}`}>
                      <span className="font-medium">{a.action}</span>
                      {a.estimated_cost > 0 && <span className="mr-2 text-slate-600">₪{a.estimated_cost}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {newForecast.recommendations && (
              <div className="md:col-span-2 bg-white rounded p-3 border text-slate-700">
                <span className="font-medium">המלצות: </span>{newForecast.recommendations}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {['forecasts', 'records'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'forecasts' ? `תחזיות ממתינות (${forecasts.length})` : `רשומות תחזוקה (${records.length})`}
          </button>
        ))}
      </div>

      {tab === 'forecasts' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forecasts.map(f => (
            <div key={f.id} className={`bg-white rounded-xl shadow-sm p-5 border ${PRIORITY_COLORS[f.priority] || 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-slate-800">{f.equipment_name}</div>
                <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[f.priority]}`}>
                  {PRIORITY_LABELS[f.priority] || f.priority}
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-2">{TYPE_LABELS[f.forecast_type] || f.forecast_type}</div>
              <div className="text-sm text-slate-700 mb-2">{f.description}</div>
              {f.predicted_date && <div className="text-xs text-slate-500 mb-1">📅 {f.predicted_date}</div>}
              {f.estimated_cost > 0 && <div className="text-xs text-slate-500 mb-3">💰 ₪{f.estimated_cost}</div>}
              <button onClick={() => markDone(f.id)}
                className="w-full flex items-center justify-center gap-1 text-xs py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-50">
                <CheckCircle size={14} /> סמן כבוצע
              </button>
            </div>
          ))}
          {forecasts.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-400">
              <Wrench size={40} className="mx-auto mb-3 opacity-30" />
              <p>אין תחזיות ממתינות</p>
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="text-right px-4 py-3 font-medium text-slate-600">ציוד</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סוג</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">תאריך</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">הבא</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">טכנאי</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">עלות</th>
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.equipment_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.type}</td>
                  <td className="px-4 py-3 text-slate-600">{r.performed_date}</td>
                  <td className="px-4 py-3 text-slate-600">{r.next_due}</td>
                  <td className="px-4 py-3 text-slate-600">{r.technician}</td>
                  <td className="px-4 py-3 text-slate-600">{r.cost ? `₪${r.cost}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
