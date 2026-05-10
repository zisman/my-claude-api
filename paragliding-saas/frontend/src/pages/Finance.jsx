import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Button, Badge, Modal, Input, Select, Textarea, PageHeader, Spinner, Alert, StatCard } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const TYPE_COLORS = { income: 'green', expense: 'red' };

export default function Finance() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0, byCategory: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ type: '' });

  const canEdit = ['admin', 'instructor'].includes(user?.role);

  const load = () => {
    Promise.all([api.transactions(filter), api.categories(), api.financeSummary()])
      .then(([tx, cats, sum]) => { setTransactions(tx); setCategories(cats); setSummary(sum); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter.type]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal.data) await api.updateTransaction(modal.data.id, form);
      else await api.createTransaction(form);
      setModal(null); setForm({}); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete transaction?')) return;
    await api.deleteTransaction(id); load();
  };

  const pieData = summary.byCategory?.filter(c => c.total > 0).map(c => ({
    name: c.name, value: c.total, color: c.color || '#6366F1',
  })) || [];

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Track income and expenses"
        action={canEdit && <Button size="sm" onClick={() => { setForm({ date: new Date().toISOString().slice(0, 10) }); setModal({ data: null }); }}>+ Add Transaction</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Income" value={`₪${summary.income?.toLocaleString()}`} icon="📈" color="green" />
        <StatCard label="Total Expenses" value={`₪${summary.expense?.toLocaleString()}`} icon="📉" color="red" />
        <StatCard label="Net Balance" value={`₪${summary.net?.toLocaleString()}`} icon="💰" color={summary.net >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Transactions</h2>
            <select className="input w-auto text-sm" value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th>{canEdit && <th></th>}</tr></thead>
              <tbody>
                {transactions.slice(0, 20).map(tx => (
                  <tr key={tx.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{tx.date}</td>
                    <td className="max-w-xs">
                      <div className="text-sm font-medium truncate">{tx.description}</div>
                      <div className="text-xs text-gray-400">{tx.payment_method}</div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tx.category_color || '#ccc' }} />
                        {tx.category_name}
                      </span>
                    </td>
                    <td>
                      <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}₪{tx.amount?.toLocaleString()}
                      </span>
                    </td>
                    {canEdit && <td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setForm(tx); setModal({ data: tx }); }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(tx.id)} className="text-red-500">Del</Button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No transactions</div>}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">By Category</h2>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-2 mt-3">
            {summary.byCategory?.filter(c => c.total > 0).map(c => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-gray-600 truncate">{c.name}</span>
                </div>
                <span className={`font-medium ${c.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>₪{c.total?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => { setModal(null); setForm({}); }} title={modal?.data ? 'Edit Transaction' : 'Add Transaction'}>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <div className="space-y-4">
          <Select label="Type" value={form.type || 'income'} onChange={set('type')}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
          <Select label="Category" value={form.category_id || ''} onChange={set('category_id')}>
            <option value="">No category</option>
            {categories.filter(c => !form.type || c.type === form.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Amount (₪)" type="number" step="0.01" value={form.amount || ''} onChange={set('amount')} required />
          <Input label="Description" value={form.description || ''} onChange={set('description')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.date || ''} onChange={set('date')} required />
            <Select label="Payment Method" value={form.payment_method || 'cash'} onChange={set('payment_method')}>
              {['cash','credit_card','bank_transfer','check','other'].map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
