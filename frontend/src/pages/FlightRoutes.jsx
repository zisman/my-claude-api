import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, Star, Map, Mountain } from 'lucide-react';

const DIFF_LABELS = { beginner: 'מתחילים', intermediate: 'בינוני', advanced: 'מתקדם', expert: 'מומחים' };
const DIFF_COLORS = { beginner: 'bg-green-100 text-green-700', intermediate: 'bg-blue-100 text-blue-700', advanced: 'bg-orange-100 text-orange-700', expert: 'bg-red-100 text-red-700' };

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={14} className={n <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
      <span className="text-xs text-slate-500 mr-1">{rating}</span>
    </div>
  );
}

export default function FlightRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [filterDiff, setFilterDiff] = useState('all');
  const [form, setForm] = useState({ name: '', description: '', location: '', difficulty: 'intermediate', distance_km: '', altitude_gain: '', max_altitude: '', conditions: '', best_season: '', created_by: '' });
  const [reviewForm, setReviewForm] = useState({ reviewer_name: '', rating: 5, comment: '', flight_date: '' });

  useEffect(() => {
    api.get('/routes').then(setRoutes);
  }, []);

  const selectRoute = async (id) => {
    const data = await api.get(`/routes/${id}`);
    setSelected(data);
  };

  const addRoute = async (e) => {
    e.preventDefault();
    await api.post('/routes', form);
    setShowForm(false);
    api.get('/routes').then(setRoutes);
  };

  const addReview = async (e) => {
    e.preventDefault();
    if (!selected) return;
    await api.post(`/routes/${selected.id}/reviews`, reviewForm);
    setShowReviewForm(false);
    setReviewForm({ reviewer_name: '', rating: 5, comment: '', flight_date: '' });
    const updated = await api.get(`/routes/${selected.id}`);
    setSelected(updated);
    api.get('/routes').then(setRoutes);
  };

  const filtered = filterDiff === 'all' ? routes : routes.filter(r => r.difficulty === filterDiff);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מסלולי טיסה</h1>
          <p className="text-slate-500 text-sm">{routes.length} מסלולים רשומים</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
          <Plus size={16} /> מסלול חדש
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <form onSubmit={addRoute} className="grid md:grid-cols-3 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם המסלול *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="מיקום" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
              {Object.entries(DIFF_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="מרחק (ק״מ)" value={form.distance_km} onChange={e => setForm({...form, distance_km: e.target.value})} />
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="עלייה (מ׳)" value={form.altitude_gain} onChange={e => setForm({...form, altitude_gain: e.target.value})} />
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="גובה מקסימלי (מ׳)" value={form.max_altitude} onChange={e => setForm({...form, max_altitude: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="תנאים מומלצים" value={form.conditions} onChange={e => setForm({...form, conditions: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="עונה מומלצת" value={form.best_season} onChange={e => setForm({...form, best_season: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="נוצר על ידי" value={form.created_by} onChange={e => setForm({...form, created_by: e.target.value})} />
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterDiff('all')} className={`px-3 py-1.5 rounded-lg text-sm ${filterDiff === 'all' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border'}`}>הכל</button>
        {Object.entries(DIFF_LABELS).map(([v, l]) => (
          <button key={v} onClick={() => setFilterDiff(v)} className={`px-3 py-1.5 rounded-lg text-sm ${filterDiff === v ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border'}`}>{l}</button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 grid md:grid-cols-2 gap-4">
          {filtered.map(route => (
            <div key={route.id} onClick={() => selectRoute(route.id)}
              className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:border-sky-300 border border-transparent transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800">{route.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${DIFF_COLORS[route.difficulty]}`}>
                  {DIFF_LABELS[route.difficulty]}
                </span>
              </div>
              <StarRating rating={route.rating} />
              <div className="text-sm text-slate-600 mt-2 space-y-1">
                <div className="flex items-center gap-2"><Map size={14} /> {route.location}</div>
                {route.distance_km && <div className="flex items-center gap-2"><Mountain size={14} /> {route.distance_km} ק"מ • עלייה {route.altitude_gain}מ'</div>}
                {route.best_season && <div className="text-xs text-slate-500">🗓 {route.best_season}</div>}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="w-80 bg-white rounded-xl shadow-sm p-5 self-start">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-slate-800">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400">×</button>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${DIFF_COLORS[selected.difficulty]}`}>{DIFF_LABELS[selected.difficulty]}</span>
            <StarRating rating={selected.rating} />

            <div className="space-y-1 text-sm mt-3 mb-4">
              {selected.location && <div><span className="text-slate-500">מיקום: </span>{selected.location}</div>}
              {selected.distance_km && <div><span className="text-slate-500">מרחק: </span>{selected.distance_km} ק"מ</div>}
              {selected.altitude_gain && <div><span className="text-slate-500">עלייה: </span>{selected.altitude_gain} מ'</div>}
              {selected.max_altitude && <div><span className="text-slate-500">גובה מקסימלי: </span>{selected.max_altitude} מ'</div>}
              {selected.conditions && <div><span className="text-slate-500">תנאים: </span>{selected.conditions}</div>}
              {selected.best_season && <div><span className="text-slate-500">עונה: </span>{selected.best_season}</div>}
              {selected.description && <div className="text-slate-600 mt-2">{selected.description}</div>}
            </div>

            <button onClick={() => setShowReviewForm(!showReviewForm)}
              className="w-full mb-3 py-2 border border-sky-300 text-sky-700 rounded-lg text-sm hover:bg-sky-50">
              הוסף ביקורת
            </button>

            {showReviewForm && (
              <form onSubmit={addReview} className="space-y-2 mb-3">
                <input className="w-full border rounded-lg px-3 py-1.5 text-xs" placeholder="שמך" value={reviewForm.reviewer_name} onChange={e => setReviewForm({...reviewForm, reviewer_name: e.target.value})} required />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs">דירוג:</span>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setReviewForm({...reviewForm, rating: n})}>
                      <Star size={16} className={n <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
                <textarea className="w-full border rounded-lg px-3 py-1.5 text-xs h-16 resize-none" placeholder="תגובה" value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
                <button type="submit" className="w-full bg-sky-600 text-white py-1.5 rounded-lg text-xs hover:bg-sky-700">שלח ביקורת</button>
              </form>
            )}

            {selected.reviews?.length > 0 && (
              <div>
                <div className="font-medium text-sm text-slate-700 mb-2">ביקורות ({selected.reviews.length})</div>
                {selected.reviews.slice(0, 3).map(r => (
                  <div key={r.id} className="bg-slate-50 rounded-lg p-2 text-xs mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{r.reviewer_name}</span>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} size={10} className={n <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}</div>
                    </div>
                    <div className="text-slate-600">{r.comment}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
