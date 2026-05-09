import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, Star } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact_name: '', phone: '', email: '', website: '', category: '', country: '', rating: 3 });

  useEffect(() => {
    api.get('/suppliers').then(setSuppliers);
  }, []);

  const selectSupplier = async (id) => {
    const data = await api.get(`/suppliers/${id}`);
    setSelected(data);
  };

  const addSupplier = async (e) => {
    e.preventDefault();
    await api.post('/suppliers', form);
    setShowForm(false);
    api.get('/suppliers').then(setSuppliers);
  };

  const deleteSupplier = async (id) => {
    if (!confirm('למחוק ספק זה?')) return;
    await api.delete(`/suppliers/${id}`);
    setSelected(null);
    api.get('/suppliers').then(setSuppliers);
  };

  const categories = [...new Set(suppliers.map(s => s.category).filter(Boolean))];

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ספקים</h1>
          <p className="text-slate-500 text-sm">{suppliers.length} ספקים רשומים</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
          <Plus size={16} /> ספק חדש
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <form onSubmit={addSupplier} className="grid md:grid-cols-3 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם ספק *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="איש קשר" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="טלפון" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="אימייל" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="קטגוריה" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="מדינה" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
            <div className="flex items-center gap-2 text-sm">
              <span>דירוג:</span>
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setForm({...form, rating: n})}>
                  <Star size={18} className={n <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-sky-600 text-white py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(s => (
              <div key={s.id} onClick={() => selectSupplier(s.id)}
                className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:border-sky-300 border border-transparent transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800">{s.name}</h3>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => <Star key={n} size={12} className={n <= s.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />)}
                  </div>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  {s.contact_name && <div>👤 {s.contact_name}</div>}
                  {s.category && <div className="text-xs bg-slate-100 px-2 py-0.5 rounded inline-block">{s.category}</div>}
                  {s.country && <div>🌍 {s.country}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="w-80 bg-white rounded-xl shadow-sm p-5 self-start">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-slate-800">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div><span className="text-slate-500">איש קשר: </span>{selected.contact_name}</div>
              <div><span className="text-slate-500">טלפון: </span>{selected.phone}</div>
              <div><span className="text-slate-500">אימייל: </span>{selected.email}</div>
              <div><span className="text-slate-500">קטגוריה: </span>{selected.category}</div>
              <div><span className="text-slate-500">מדינה: </span>{selected.country}</div>
            </div>

            {selected.orders?.length > 0 && (
              <div>
                <div className="font-medium text-slate-600 text-sm mb-2">הזמנות אחרונות</div>
                {selected.orders.slice(0, 3).map(o => (
                  <div key={o.id} className="text-xs border rounded p-2 mb-1">
                    <div className="flex justify-between">
                      <span>{o.order_date}</span>
                      <span className="font-medium">₪{o.total_amount}</span>
                    </div>
                    <div className={`text-xs ${o.status === 'delivered' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {o.status === 'delivered' ? 'סופק' : o.status === 'pending' ? 'ממתין' : o.status}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => deleteSupplier(selected.id)}
              className="w-full mt-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
              מחק ספק
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
