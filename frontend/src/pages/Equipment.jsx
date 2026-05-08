import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, Package } from 'lucide-react';

const TYPE_LABELS = { wing: 'כנף', harness: 'רתמה', reserve: 'מצנח חירום', radio: 'רדיו', helmet: 'קסדה', other: 'אחר' };
const CONDITION_COLORS = { excellent: 'bg-green-100 text-green-700', good: 'bg-blue-100 text-blue-700', fair: 'bg-yellow-100 text-yellow-700', poor: 'bg-red-100 text-red-700' };
const CONDITION_LABELS = { excellent: 'מצוין', good: 'טוב', fair: 'סביר', poor: 'גרוע' };

export default function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'wing', brand: '', model: '', serial_number: '', purchase_date: '', purchase_price: '', owner_type: 'club', owner_name: '' });

  useEffect(() => {
    api.get('/equipment').then(setEquipment);
  }, []);

  const selectEquipment = async (id) => {
    const data = await api.get(`/equipment/${id}`);
    setSelected(data);
  };

  const addEquipment = async (e) => {
    e.preventDefault();
    await api.post('/equipment', form);
    setShowForm(false);
    api.get('/equipment').then(setEquipment);
  };

  const filtered = filter === 'all' ? equipment : equipment.filter(e => e.type === filter);
  const types = [...new Set(equipment.map(e => e.type))];

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול ציוד</h1>
          <p className="text-slate-500 text-sm">{equipment.length} פריטים</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
          <Plus size={16} /> ציוד חדש
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <form onSubmit={addEquipment} className="grid md:grid-cols-3 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם הפריט *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="מותג" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="דגם" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="מספר סידורי" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
            <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} />
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="מחיר רכישה ₪" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.owner_type} onChange={e => setForm({...form, owner_type: e.target.value})}>
              <option value="club">מועדון</option>
              <option value="student">תלמיד</option>
              <option value="member">חבר</option>
            </select>
            {form.owner_type !== 'club' && (
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שם הבעלים" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} />
            )}
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm ${filter === 'all' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border'}`}>
          הכל ({equipment.length})
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === t ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border'}`}>
            {TYPE_LABELS[t] || t} ({equipment.filter(e => e.type === t).length})
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b"><tr>
                <th className="text-right px-4 py-3 font-medium text-slate-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">סוג</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">מותג/דגם</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">בעלות</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">מצב</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">טיסות</th>
              </tr></thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} onClick={() => selectEquipment(item.id)} className="border-b hover:bg-sky-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[item.type] || item.type}</td>
                    <td className="px-4 py-3 text-slate-600">{item.brand} {item.model}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${item.owner_type === 'club' ? 'bg-blue-100 text-blue-700' : item.owner_type === 'student' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {item.owner_type === 'club' ? 'מועדון' : item.owner_name || item.owner_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${CONDITION_COLORS[item.condition] || 'bg-gray-100'}`}>
                        {CONDITION_LABELS[item.condition] || item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.total_flights}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="w-80 bg-white rounded-xl shadow-sm p-5 self-start">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-slate-800">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400">×</button>
            </div>
            <div className="space-y-1 text-sm mb-4">
              <div><span className="text-slate-500">מותג: </span>{selected.brand} {selected.model}</div>
              <div><span className="text-slate-500">סידורי: </span>{selected.serial_number}</div>
              <div><span className="text-slate-500">טיסות: </span>{selected.total_flights}</div>
              <div><span className="text-slate-500">שעות: </span>{selected.total_hours}</div>
              <div><span className="text-slate-500">בדיקה אחרונה: </span>{selected.last_inspection || 'לא ידוע'}</div>
              <div><span className="text-slate-500">בדיקה הבאה: </span>{selected.next_inspection || 'לא נקבעה'}</div>
            </div>

            {selected.maintenance?.length > 0 && (
              <div>
                <div className="font-medium text-slate-600 text-xs mb-2">תחזוקה אחרונה</div>
                {selected.maintenance.slice(0, 3).map(m => (
                  <div key={m.id} className="text-xs border rounded p-2 mb-1">
                    <div className="font-medium">{m.type}</div>
                    <div className="text-slate-500">{m.performed_date}</div>
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
