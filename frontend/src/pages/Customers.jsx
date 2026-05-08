import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, Search, Star } from 'lucide-react';

const MEMBERSHIP_LABELS = { regular: 'רגיל', premium: 'פרימיום', annual: 'שנתי' };
const MEMBERSHIP_COLORS = { regular: 'bg-gray-100 text-gray-700', premium: 'bg-yellow-100 text-yellow-700', annual: 'bg-blue-100 text-blue-700' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', membership_type: 'regular', membership_expiry: '', certifications: '', notes: '' });

  useEffect(() => {
    api.get('/customers').then(setCustomers);
  }, []);

  const selectCustomer = async (id) => {
    const data = await api.get(`/customers/${id}`);
    setSelected(data);
  };

  const addCustomer = async (e) => {
    e.preventDefault();
    await api.post('/customers', form);
    setShowForm(false);
    setForm({ name: '', phone: '', email: '', membership_type: 'regular', membership_expiry: '', certifications: '', notes: '' });
    api.get('/customers').then(setCustomers);
  };

  const filtered = customers.filter(c =>
    c.name.includes(search) || (c.phone || '').includes(search) || (c.email || '').includes(search)
  );

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">לקוחות</h1>
          <p className="text-slate-500 text-sm">{customers.length} לקוחות רשומים</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
          <Plus size={16} /> לקוח חדש
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-4">הוספת לקוח חדש</h3>
          <form onSubmit={addCustomer} className="grid md:grid-cols-3 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם מלא *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="טלפון" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="אימייל" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.membership_type} onChange={e => setForm({...form, membership_type: e.target.value})}>
              <option value="regular">רגיל</option>
              <option value="premium">פרימיום</option>
              <option value="annual">שנתי</option>
            </select>
            <input type="date" className="border rounded-lg px-3 py-2 text-sm" placeholder="תפוגת חברות" value={form.membership_expiry} onChange={e => setForm({...form, membership_expiry: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="תעודות (P2,P3...)" value={form.certifications} onChange={e => setForm({...form, certifications: e.target.value})} />
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative mb-4">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
            <input className="w-full border rounded-lg pr-9 pl-3 py-2 text-sm" placeholder="חיפוש לפי שם, טלפון או אימייל..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b"><tr>
                <th className="text-right px-4 py-3 font-medium text-slate-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">טלפון</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">חברות</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">תעודות</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">טיסות</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => selectCustomer(c.id)}
                    className="border-b hover:bg-sky-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${MEMBERSHIP_COLORS[c.membership_type] || 'bg-gray-100'}`}>
                        {MEMBERSHIP_LABELS[c.membership_type] || c.membership_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.certifications}</td>
                    <td className="px-4 py-3 text-slate-600">{c.total_flights}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="w-80 bg-white rounded-xl shadow-sm p-5 self-start">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex gap-2"><span className="text-slate-500">טלפון:</span><span>{selected.phone}</span></div>
              <div className="flex gap-2"><span className="text-slate-500">אימייל:</span><span className="truncate">{selected.email}</span></div>
              <div className="flex gap-2"><span className="text-slate-500">חברות:</span><span>{MEMBERSHIP_LABELS[selected.membership_type]}</span></div>
              <div className="flex gap-2"><span className="text-slate-500">תפוגה:</span><span>{selected.membership_expiry}</span></div>
              <div className="flex gap-2"><span className="text-slate-500">תעודות:</span><span>{selected.certifications}</span></div>
              <div className="flex gap-2"><span className="text-slate-500">טיסות:</span><span>{selected.total_flights}</span></div>
            </div>
            {selected.interactions?.length > 0 && (
              <div>
                <div className="font-medium text-slate-600 text-sm mb-2">אינטראקציות אחרונות</div>
                <div className="space-y-2">
                  {selected.interactions.slice(0, 3).map(i => (
                    <div key={i.id} className="text-xs border rounded p-2">
                      <div className="font-medium">{i.type}</div>
                      <div className="text-slate-500">{i.description}</div>
                      <div className="text-slate-400">{i.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
