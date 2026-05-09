import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, Wind, Calendar } from 'lucide-react';

const STATUS_MAP = { pending: 'ממתין', confirmed: 'מאושר', completed: 'הושלם', cancelled: 'בוטל' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };

export default function Flights() {
  const [flights, setFlights] = useState([]);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('flights');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', flight_date: '', flight_time: '', pilot: '', location: 'הגלבוע', duration_minutes: 20, price: 350 });
  const [eventForm, setEventForm] = useState({ name: '', description: '', event_date: '', location: '', max_participants: '', price: 0, type: 'social' });
  const [showEventForm, setShowEventForm] = useState(false);

  useEffect(() => {
    api.get('/flights').then(setFlights);
    api.get('/flights/events').then(setEvents);
  }, []);

  const addFlight = async (e) => {
    e.preventDefault();
    await api.post('/flights', form);
    setShowForm(false);
    api.get('/flights').then(setFlights);
  };

  const addEvent = async (e) => {
    e.preventDefault();
    await api.post('/flights/events', eventForm);
    setShowEventForm(false);
    api.get('/flights/events').then(setEvents);
  };

  const updateFlight = async (id, updates) => {
    const flight = flights.find(f => f.id === id);
    await api.put(`/flights/${id}`, { ...flight, ...updates });
    api.get('/flights').then(setFlights);
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">טיסות חוויה ואירועים</h1>
        </div>
        <div className="flex gap-2">
          {tab === 'flights' && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
              <Plus size={16} /> טיסה חדשה
            </button>
          )}
          {tab === 'events' && (
            <button onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
              <Plus size={16} /> אירוע חדש
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {['flights', 'events'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'flights' ? `טיסות חוויה (${flights.length})` : `אירועים (${events.length})`}
          </button>
        ))}
      </div>

      {tab === 'flights' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <form onSubmit={addFlight} className="grid md:grid-cols-3 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם לקוח *" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} required />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="טלפון" value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} />
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.flight_date} onChange={e => setForm({...form, flight_date: e.target.value})} />
                <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={form.flight_time} onChange={e => setForm({...form, flight_time: e.target.value})} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="טייס" value={form.pilot} onChange={e => setForm({...form, pilot: e.target.value})} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={form.location} onChange={e => setForm({...form, location: e.target.value})}>
                  <option>הגלבוע</option><option>הכרמל</option><option>חרמון</option><option>ים המלח</option>
                </select>
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="משך (דקות)" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} />
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="מחיר ₪" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-sky-600 text-white py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
                </div>
              </form>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b"><tr>
                <th className="text-right px-4 py-3 font-medium text-slate-600">לקוח</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">תאריך</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">טייס</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">אתר</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">מחיר</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">תשלום</th>
              </tr></thead>
              <tbody>
                {flights.map(f => (
                  <tr key={f.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{f.customer_name}<br/><span className="text-xs text-slate-400">{f.customer_phone}</span></td>
                    <td className="px-4 py-3 text-slate-600">{f.flight_date}<br/><span className="text-xs">{f.flight_time}</span></td>
                    <td className="px-4 py-3 text-slate-600">{f.pilot}</td>
                    <td className="px-4 py-3 text-slate-600">{f.location}</td>
                    <td className="px-4 py-3 text-slate-600">₪{f.price}</td>
                    <td className="px-4 py-3">
                      <select value={f.status} onChange={e => updateFlight(f.id, { status: e.target.value })}
                        className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[f.status]}`}>
                        {Object.entries(STATUS_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${f.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {f.payment_status === 'paid' ? 'שולם' : 'לא שולם'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'events' && (
        <>
          {showEventForm && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <form onSubmit={addEvent} className="grid md:grid-cols-3 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם האירוע *" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} required />
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="מיקום" value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} />
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="מקסימום משתתפים" value={eventForm.max_participants} onChange={e => setEventForm({...eventForm, max_participants: e.target.value})} />
                <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="מחיר ₪" value={eventForm.price} onChange={e => setEventForm({...eventForm, price: e.target.value})} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value})}>
                  <option value="social">חברתי</option>
                  <option value="competition">תחרות</option>
                  <option value="education">חינוכי</option>
                  <option value="training">אימון</option>
                </select>
                <div className="md:col-span-3 flex gap-2">
                  <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
                  <button type="button" onClick={() => setShowEventForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
                </div>
              </form>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(e => (
              <div key={e.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800">{e.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${e.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {e.status === 'upcoming' ? 'קרוב' : e.status}
                  </span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <div>📅 {e.event_date}</div>
                  <div>📍 {e.location}</div>
                  <div>👥 {e.registration_count}/{e.max_participants || '∞'} רשומים</div>
                  {e.price > 0 && <div>💰 ₪{e.price}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
