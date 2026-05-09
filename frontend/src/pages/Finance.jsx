import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Clock, Users, X } from 'lucide-react';

const PAYMENT_TYPES = { membership: 'דמי חבר', course: 'קורס', flight: 'טיסת חוויה', event: 'אירוע', equipment_loan: 'השאלת ציוד', other: 'אחר' };
const PAYMENT_METHODS = { cash: 'מזומן', credit: 'אשראי', transfer: 'העברה', check: 'צ׳ק', app: 'אפליקציה' };
const EXPENSE_CATEGORIES = { equipment: 'ציוד', maintenance: 'תחזוקה', insurance: 'ביטוח', site_rental: 'שכירת אתר', fuel: 'דלק', admin: 'ניהול', salary: 'משכורות', supplier: 'ספק', other: 'אחר' };
const STATUS_COLORS = { paid: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', partial: 'bg-orange-100 text-orange-700', cancelled: 'bg-red-100 text-red-700' };
const STATUS_LABELS = { paid: 'שולם', pending: 'ממתין', partial: 'חלקי', cancelled: 'בוטל' };

const MONTH_NAMES = { '01': 'ינו', '02': 'פבר', '03': 'מרץ', '04': 'אפר', '05': 'מאי', '06': 'יוני', '07': 'יולי', '08': 'אוג', '09': 'ספט', '10': 'אוק', '11': 'נוב', '12': 'דצמ' };

function fmt(n) { return `₪${Number(n || 0).toLocaleString('he-IL')}`; }

function StatCard({ label, value, sub, color, icon: Icon, negative }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-r-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-2xl font-bold ${negative ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
          <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
        </div>
        <Icon size={28} className="text-slate-300 mt-1" />
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- Payments Tab ----
function PaymentsTab({ onRefresh }) {
  const [payments, setPayments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState({ type: '', status: '', year: new Date().getFullYear() });
  const [form, setForm] = useState({ payment_date: new Date().toISOString().split('T')[0], amount: '', payment_type: 'membership', payment_method: 'cash', payer_name: '', description: '', status: 'paid' });

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (filter.type) q.set('type', filter.type);
    if (filter.status) q.set('status', filter.status);
    if (filter.year) q.set('year', filter.year);
    api.get(`/finance/payments?${q}`).then(setPayments);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    await api.post('/finance/payments', form);
    setShowAdd(false);
    load(); onRefresh();
  };

  const del = async (id) => {
    if (!confirm('למחוק תשלום זה?')) return;
    await api.delete(`/finance/payments/${id}`);
    load(); onRefresh();
  };

  const totalShown = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})}>
            <option value="">כל הסוגים</option>
            {Object.entries(PAYMENT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">כל הסטטוסים</option>
            <option value="paid">שולם</option>
            <option value="pending">ממתין</option>
          </select>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>
            {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-green-700">{fmt(totalShown)} סה"כ</span>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Plus size={14} /> תשלום חדש
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-slate-600">תאריך</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">משלם</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סוג</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">אמצעי</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סכום</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{p.payment_date}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.payer_name}</div>
                  {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{PAYMENT_TYPES[p.payment_type] || p.payment_type}</td>
                <td className="px-4 py-3 text-slate-600">{PAYMENT_METHODS[p.payment_method] || p.payment_method}</td>
                <td className="px-4 py-3 font-bold text-green-700">{fmt(p.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => del(p.id)} className="text-red-400 hover:text-red-600 text-xs">מחק</button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">אין תשלומים</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="תשלום חדש" onClose={() => setShowAdd(false)}>
          <form onSubmit={save} className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">תאריך</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">סכום ₪ *</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">שם המשלם *</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.payer_name} onChange={e => setForm({...form, payer_name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">סוג תשלום</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.payment_type} onChange={e => setForm({...form, payment_type: e.target.value})}>
                  {Object.entries(PAYMENT_TYPES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">אמצעי תשלום</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                  {Object.entries(PAYMENT_METHODS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">סטטוס</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="paid">שולם</option>
                  <option value="pending">ממתין</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">תיאור</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">שמור</button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---- Expenses Tab ----
function ExpensesTab({ onRefresh }) {
  const [expenses, setExpenses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState({ category: '', status: '', year: new Date().getFullYear() });
  const [form, setForm] = useState({ expense_date: new Date().toISOString().split('T')[0], amount: '', category: 'maintenance', description: '', payment_method: 'transfer', status: 'paid', invoice_number: '', notes: '' });

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (filter.category) q.set('category', filter.category);
    if (filter.status) q.set('status', filter.status);
    if (filter.year) q.set('year', filter.year);
    api.get(`/finance/expenses?${q}`).then(setExpenses);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    await api.post('/finance/expenses', form);
    setShowAdd(false);
    load(); onRefresh();
  };

  const del = async (id) => {
    if (!confirm('למחוק הוצאה זו?')) return;
    await api.delete(`/finance/expenses/${id}`);
    load(); onRefresh();
  };

  const total = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value})}>
            <option value="">כל הקטגוריות</option>
            {Object.entries(EXPENSE_CATEGORIES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">כל הסטטוסים</option>
            <option value="paid">שולם</option>
            <option value="pending">ממתין</option>
          </select>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>
            {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-red-700">{fmt(total)} סה"כ</span>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <Plus size={14} /> הוצאה חדשה
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-slate-600">תאריך</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">תיאור</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">קטגוריה</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">אמצעי</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סכום</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{e.expense_date}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{e.description}</div>
                  {e.invoice_number && <div className="text-xs text-slate-400">חשבונית: {e.invoice_number}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{EXPENSE_CATEGORIES[e.category] || e.category}</td>
                <td className="px-4 py-3 text-slate-600">{PAYMENT_METHODS[e.payment_method] || e.payment_method}</td>
                <td className="px-4 py-3 font-bold text-red-700">{fmt(e.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[e.status]}`}>
                    {STATUS_LABELS[e.status] || e.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => del(e.id)} className="text-red-400 hover:text-red-600 text-xs">מחק</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">אין הוצאות</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="הוצאה חדשה" onClose={() => setShowAdd(false)}>
          <form onSubmit={save} className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">תאריך</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">סכום ₪ *</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">קטגוריה</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {Object.entries(EXPENSE_CATEGORIES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">אמצעי תשלום</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                  {Object.entries(PAYMENT_METHODS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">מס׳ חשבונית</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">סטטוס</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="paid">שולם</option>
                  <option value="pending">ממתין לתשלום</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">תיאור *</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">שמור</button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---- Member Dues Tab ----
function DuesTab({ onRefresh }) {
  const [dues, setDues] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount_paid: '', payment_method: 'cash' });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ member_name: '', member_phone: '', member_type: 'member', amount_due: 800, due_date: `${new Date().getFullYear()}-01-31` });

  const load = useCallback(() => {
    const q = new URLSearchParams({ year });
    if (statusFilter) q.set('status', statusFilter);
    api.get(`/finance/dues?${q}`).then(setDues);
  }, [year, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const pay = async (e) => {
    e.preventDefault();
    await api.put(`/finance/dues/${payModal.id}/pay`, payForm);
    setPayModal(null);
    load(); onRefresh();
  };

  const addDue = async (e) => {
    e.preventDefault();
    await api.post('/finance/dues', { ...addForm, year });
    setShowAdd(false);
    load(); onRefresh();
  };

  const del = async (id) => {
    if (!confirm('למחוק רשומה זו?')) return;
    await api.delete(`/finance/dues/${id}`);
    load(); onRefresh();
  };

  const paid = dues.filter(d => d.status === 'paid').length;
  const pending = dues.filter(d => d.status !== 'paid' && d.status !== 'waived').length;
  const totalDebt = dues.filter(d => d.status !== 'paid').reduce((s, d) => s + (d.amount_due - d.amount_paid), 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <div className="flex gap-2 items-center">
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={year} onChange={e => setYear(e.target.value)}>
            {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">כל הסטטוסים</option>
            <option value="paid">שולם</option>
            <option value="pending">ממתין</option>
            <option value="partial">חלקי</option>
          </select>
          <span className="text-sm text-slate-500">{paid} שילמו · {pending} חייבים · {fmt(totalDebt)} חוב</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
          <Plus size={14} /> הוסף דמי חבר
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-slate-600">שם</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סוג</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">לתשלום</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">שולם</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">יתרה</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {dues.map(d => (
              <tr key={d.id} className={`border-b hover:bg-slate-50 ${d.status !== 'paid' && d.status !== 'waived' ? 'bg-yellow-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{d.member_name}</div>
                  {d.member_phone && <div className="text-xs text-slate-400">{d.member_phone}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{d.member_type === 'student' ? 'תלמיד' : 'חבר'}</td>
                <td className="px-4 py-3 font-medium">{fmt(d.amount_due)}</td>
                <td className="px-4 py-3 text-green-700">{fmt(d.amount_paid)}</td>
                <td className="px-4 py-3 font-bold text-red-600">{d.status !== 'paid' ? fmt(d.amount_due - d.amount_paid) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[d.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[d.status] || d.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {d.status !== 'paid' && d.status !== 'waived' && (
                      <button onClick={() => { setPayModal(d); setPayForm({ amount_paid: d.amount_due - d.amount_paid, payment_method: 'cash' }); }}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                        גבה
                      </button>
                    )}
                    <button onClick={() => del(d.id)} className="text-red-400 hover:text-red-600 text-xs">מחק</button>
                  </div>
                </td>
              </tr>
            ))}
            {dues.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">אין רשומות לשנה זו</td></tr>}
          </tbody>
        </table>
      </div>

      {payModal && (
        <Modal title={`גביית דמי חבר — ${payModal.member_name}`} onClose={() => setPayModal(null)}>
          <form onSubmit={pay} className="space-y-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div>חוב: <strong>{fmt(payModal.amount_due - payModal.amount_paid)}</strong></div>
              <div>שולם עד כה: {fmt(payModal.amount_paid)}</div>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">סכום לגביה ₪</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2" value={payForm.amount_paid} onChange={e => setPayForm({...payForm, amount_paid: e.target.value})} required min="1" />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">אמצעי תשלום</label>
              <select className="w-full border rounded-lg px-3 py-2" value={payForm.payment_method} onChange={e => setPayForm({...payForm, payment_method: e.target.value})}>
                {Object.entries(PAYMENT_METHODS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">אשר גביה</button>
              <button type="button" onClick={() => setPayModal(null)} className="px-4 py-2 border rounded-lg">ביטול</button>
            </div>
          </form>
        </Modal>
      )}

      {showAdd && (
        <Modal title="הוספת דמי חבר" onClose={() => setShowAdd(false)}>
          <form onSubmit={addDue} className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-600 mb-1">שם *</label>
                <input className="w-full border rounded-lg px-3 py-2" value={addForm.member_name} onChange={e => setAddForm({...addForm, member_name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">טלפון</label>
                <input className="w-full border rounded-lg px-3 py-2" value={addForm.member_phone} onChange={e => setAddForm({...addForm, member_phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">סוג</label>
                <select className="w-full border rounded-lg px-3 py-2" value={addForm.member_type} onChange={e => setAddForm({...addForm, member_type: e.target.value})}>
                  <option value="member">חבר מועדון</option>
                  <option value="student">תלמיד</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">סכום ₪ *</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2" value={addForm.amount_due} onChange={e => setAddForm({...addForm, amount_due: e.target.value})} required />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">תאריך יעד</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2" value={addForm.due_date} onChange={e => setAddForm({...addForm, due_date: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700">שמור</button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---- Debtors Tab ----
function DebtorsTab() {
  const [debtors, setDebtors] = useState([]);

  useEffect(() => {
    api.get('/finance/debtors').then(setDebtors);
  }, []);

  const total = debtors.reduce((s, d) => s + d.balance, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-slate-700">חייבים פתוחים</h4>
        <span className="text-sm font-bold text-red-700">{fmt(total)} סה"כ חוב</span>
      </div>

      {debtors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
          <div className="text-green-700 font-medium">כל החברים שילמו!</div>
          <div className="text-slate-400 text-sm mt-1">אין חובות פתוחים</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-slate-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">טלפון</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">סוג</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">חייב</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">שולם</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">יתרה לתשלום</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((d, i) => (
                <tr key={i} className="border-b hover:bg-red-50">
                  <td className="px-4 py-3 font-medium">{d.member_name}</td>
                  <td className="px-4 py-3 text-slate-600">{d.member_phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{d.member_type === 'student' ? 'תלמיד' : 'חבר'}</td>
                  <td className="px-4 py-3">{fmt(d.total_due)}</td>
                  <td className="px-4 py-3 text-green-700">{fmt(d.total_paid)}</td>
                  <td className="px-4 py-3 font-bold text-red-700 text-lg">{fmt(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Dashboard Tab ----
function DashboardTab({ summary }) {
  if (!summary) return <div className="text-center py-12 text-slate-400">טוען...</div>;

  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const ms = `${year}-${m}`;
    const inc = summary.monthly?.find(x => x.month === ms)?.income || 0;
    const exp = summary.monthly_expenses?.find(x => x.month === ms)?.expenses || 0;
    return { name: MONTH_NAMES[m], income: inc, expenses: exp, profit: inc - exp };
  });

  const byType = Object.entries(PAYMENT_TYPES).map(([k, label]) => ({
    name: label,
    value: summary.by_type?.find(x => x.payment_type === k)?.total || 0
  })).filter(x => x.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-slate-700 mb-3">הכנסות מול הוצאות {year}</h4>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={months} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}K` : v} />
              <Tooltip formatter={(val) => fmt(val)} />
              <Legend />
              <Bar dataKey="income" name="הכנסות" fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="expenses" name="הוצאות" fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h4 className="font-medium text-slate-700 mb-3">הכנסות לפי סוג — {year}</h4>
          {byType.length === 0 ? <p className="text-slate-400 text-sm">אין נתונים</p> : (
            <div className="space-y-2">
              {byType.sort((a,b) => b.value - a.value).map(({ name, value }) => (
                <div key={name} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{name}</span>
                  <span className="font-medium">{fmt(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h4 className="font-medium text-slate-700 mb-3">הוצאות לפי קטגוריה — {year}</h4>
          {!summary.expense_by_category?.length ? <p className="text-slate-400 text-sm">אין נתונים</p> : (
            <div className="space-y-2">
              {summary.expense_by_category.sort((a,b) => b.total - a.total).map(row => (
                <div key={row.category} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{EXPENSE_CATEGORIES[row.category] || row.category}</span>
                  <span className="font-medium text-red-700">{fmt(row.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h4 className="font-medium text-slate-700 mb-3">תשלומים אחרונים</h4>
          <div className="space-y-2">
            {summary.recent_payments?.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                <div>
                  <span className="font-medium">{p.payer_name}</span>
                  <span className="text-slate-400 text-xs mr-2">{p.payment_date}</span>
                </div>
                <span className="font-bold text-green-700">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h4 className="font-medium text-slate-700 mb-3">הוצאות אחרונות</h4>
          <div className="space-y-2">
            {summary.recent_expenses?.map(e => (
              <div key={e.id} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                <div>
                  <span className="font-medium">{e.description}</span>
                  <span className="text-slate-400 text-xs mr-2">{e.expense_date}</span>
                </div>
                <span className="font-bold text-red-700">{fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function Finance() {
  const [tab, setTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);

  const loadSummary = useCallback(() => {
    api.get('/finance/summary').then(setSummary);
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const thisMonthProfit = summary ? summary.this_month.income - summary.this_month.expenses : 0;

  return (
    <div className="p-6 animate-fade-in" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ניהול כספים</h1>
        <p className="text-slate-500 text-sm">מעקב הכנסות, הוצאות ודמי חבר</p>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="הכנסות החודש" value={fmt(summary.this_month.income)} sub={`${fmt(summary.this_year.income)} השנה`} color="border-green-500" icon={TrendingUp} />
          <StatCard label="הוצאות החודש" value={fmt(summary.this_month.expenses)} sub={`${fmt(summary.this_year.expenses)} השנה`} color="border-red-500" icon={TrendingDown} negative />
          <StatCard label="רווח החודש" value={fmt(thisMonthProfit)} color={thisMonthProfit >= 0 ? 'border-sky-500' : 'border-orange-500'} icon={DollarSign} negative={thisMonthProfit < 0} />
          <StatCard label="חוב פתוח" value={fmt(summary.dues_unpaid)} sub={`${summary.debtors_count} חייבים`} color="border-yellow-500" icon={Users} negative />
        </div>
      )}

      {/* Alerts */}
      {summary && (summary.pending_income > 0 || summary.pending_expenses > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm">
          <div className="font-medium text-yellow-800 flex items-center gap-2"><AlertCircle size={16} /> ממתינים לטיפול:</div>
          <div className="mt-1 text-yellow-700 space-y-0.5">
            {summary.pending_income > 0 && <div>• {fmt(summary.pending_income)} הכנסות ממתינות לאישור</div>}
            {summary.pending_expenses > 0 && <div>• {fmt(summary.pending_expenses)} הוצאות ממתינות לתשלום</div>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <TabBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>לוח בקרה</TabBtn>
        <TabBtn active={tab === 'payments'} onClick={() => setTab('payments')}>תשלומים</TabBtn>
        <TabBtn active={tab === 'expenses'} onClick={() => setTab('expenses')}>הוצאות</TabBtn>
        <TabBtn active={tab === 'dues'} onClick={() => setTab('dues')}>דמי חבר</TabBtn>
        <TabBtn active={tab === 'debtors'} onClick={() => setTab('debtors')}>
          חייבים {summary?.debtors_count > 0 && <span className="mr-1 bg-red-500 text-white text-xs rounded-full px-1.5">{summary.debtors_count}</span>}
        </TabBtn>
      </div>

      {tab === 'dashboard' && <DashboardTab summary={summary} />}
      {tab === 'payments' && <PaymentsTab onRefresh={loadSummary} />}
      {tab === 'expenses' && <ExpensesTab onRefresh={loadSummary} />}
      {tab === 'dues' && <DuesTab onRefresh={loadSummary} />}
      {tab === 'debtors' && <DebtorsTab />}
    </div>
  );
}
