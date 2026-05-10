import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Button, Badge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Spinner, Alert } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_COLORS = { active: 'green', maintenance: 'yellow', retired: 'gray', rented: 'blue' };
const TYPE_ICONS = { wing: '🪂', harness: '🪑', reserve: '⛑️', helmet: '🪖', instrument: '📡' };

export default function Equipment() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('equipment');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = ['admin', 'instructor'].includes(user?.role);

  const load = () => {
    Promise.all([api.equipment(), api.safetyChecks()])
      .then(([eq, sc]) => { setItems(eq); setChecks(sc); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openNew = () => setModal({ type: 'equipment', data: null });
  const openCheck = () => setModal({ type: 'check', data: null });
  const openEdit = (item) => { setForm(item); setModal({ type: 'equipment', data: item }); };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (modal.type === 'equipment') {
        if (modal.data) await api.updateEquipment(modal.data.id, form);
        else await api.createEquipment(form);
      } else {
        await api.createSafetyCheck(form);
      }
      setModal(null);
      setForm({});
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this equipment?')) return;
    await api.deleteEquipment(id);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle={`${items.length} items · ${items.filter(e => e.status === 'active').length} active`}
        action={canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={openCheck}>+ Safety Check</Button>
            <Button size="sm" onClick={openNew}>+ Add Equipment</Button>
          </div>
        )}
      />

      <div className="flex gap-2 mb-4">
        {['equipment', 'safety'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t === 'equipment' ? '🪂 Equipment' : '🔍 Safety Checks'}
          </button>
        ))}
      </div>

      {tab === 'equipment' && (
        <div className="table-container">
          <table className="table">
            <thead><tr>
              <th>Equipment</th><th>Type</th><th>Serial</th><th>Flight Hrs</th>
              <th>Status</th><th>Next Check</th>{canEdit && <th></th>}
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium">{TYPE_ICONS[item.type] || '📦'} {item.name}</div>
                    <div className="text-xs text-gray-400">{item.brand} {item.model}</div>
                  </td>
                  <td className="capitalize">{item.type}</td>
                  <td className="text-xs text-gray-500 font-mono">{item.serial_number}</td>
                  <td>{item.flight_hours?.toFixed(1)}</td>
                  <td><Badge color={STATUS_COLORS[item.status] || 'gray'}>{item.status}</Badge></td>
                  <td className="text-xs">{item.next_inspection || '—'}</td>
                  {canEdit && <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(item.id)} className="text-red-500 hover:text-red-700">Del</Button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <EmptyState icon="🪂" title="No equipment yet" description="Add your club's wings, harnesses, and instruments." action={canEdit && <Button onClick={openNew}>Add Equipment</Button>} />}
        </div>
      )}

      {tab === 'safety' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Equipment</th><th>Inspector</th><th>Date</th><th>Result</th><th>Next Check</th><th>Notes</th></tr></thead>
            <tbody>
              {checks.map(c => (
                <tr key={c.id}>
                  <td className="font-medium">{c.equipment_name}</td>
                  <td>{c.inspector_name}</td>
                  <td>{c.check_date}</td>
                  <td><Badge color={c.result === 'pass' ? 'green' : c.result === 'fail' ? 'red' : 'yellow'}>{c.result}</Badge></td>
                  <td>{c.next_check_date || '—'}</td>
                  <td className="text-xs text-gray-500 max-w-xs truncate">{c.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {checks.length === 0 && <EmptyState icon="🔍" title="No safety checks yet" />}
        </div>
      )}

      <Modal open={!!modal} onClose={() => { setModal(null); setForm({}); }} title={modal?.type === 'equipment' ? (modal.data ? 'Edit Equipment' : 'Add Equipment') : 'Log Safety Check'}>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <div className="space-y-4">
          {modal?.type === 'equipment' ? (
            <>
              <Input label="Name" value={form.name || ''} onChange={set('name')} required />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Type" value={form.type || ''} onChange={set('type')}>
                  <option value="">Select type</option>
                  {['wing','harness','reserve','helmet','instrument','other'].map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Select label="Status" value={form.status || 'active'} onChange={set('status')}>
                  {['active','maintenance','retired','rented'].map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Brand" value={form.brand || ''} onChange={set('brand')} />
                <Input label="Model" value={form.model || ''} onChange={set('model')} />
              </div>
              <Input label="Serial Number" value={form.serial_number || ''} onChange={set('serial_number')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Purchase Date" type="date" value={form.purchase_date || ''} onChange={set('purchase_date')} />
                <Input label="Purchase Price (₪)" type="number" value={form.purchase_price || ''} onChange={set('purchase_price')} />
              </div>
              <Input label="Flight Hours" type="number" step="0.1" value={form.flight_hours || ''} onChange={set('flight_hours')} />
              <Textarea label="Notes" value={form.notes || ''} onChange={set('notes')} rows={2} />
            </>
          ) : (
            <>
              <Select label="Equipment" value={form.equipment_id || ''} onChange={set('equipment_id')} required>
                <option value="">Select equipment</option>
                {items.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Check Date" type="date" value={form.check_date || ''} onChange={set('check_date')} required />
                <Select label="Result" value={form.result || ''} onChange={set('result')} required>
                  <option value="">Select result</option>
                  {['pass','fail','conditional'].map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </div>
              <Input label="Next Check Date" type="date" value={form.next_check_date || ''} onChange={set('next_check_date')} />
              <Textarea label="Notes" value={form.notes || ''} onChange={set('notes')} rows={3} />
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
