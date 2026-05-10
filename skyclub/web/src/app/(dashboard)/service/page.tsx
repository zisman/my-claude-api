'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';

const STATUS_STEPS = ['RECEIVED','DIAGNOSIS','WAITING_APPROVAL','APPROVED','IN_PROGRESS','WAITING_PARTS','QA','READY','INVOICED','SHIPPED','CLOSED'];
const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-700', DIAGNOSIS: 'bg-purple-100 text-purple-700',
  WAITING_APPROVAL: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-brand-100 text-brand-700', WAITING_PARTS: 'bg-orange-100 text-orange-700',
  QA: 'bg-teal-100 text-teal-700', READY: 'bg-emerald-100 text-emerald-700',
  INVOICED: 'bg-indigo-100 text-indigo-700', SHIPPED: 'bg-sky-100 text-sky-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

function Modal({ open, onClose, title, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ServicePage() {
  const { data: orders, mutate } = useSWR('service-orders', () => api.equipment.serviceOrders());
  const { data: equipment } = useSWR('equipment', () => api.equipment.list());
  const [modal, setModal] = useState<{ open: boolean; data?: any; type: 'new' | 'update' }>({ open: false, type: 'new' });
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal.type === 'update') await api.equipment.updateServiceOrder(modal.data.id, form);
      else await api.equipment.createServiceOrder(form);
      setModal({ open: false, type: 'new' });
      mutate();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const filtered = (orders || []).filter((o: any) => !filterStatus || o.status === filterStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-sm text-gray-500">{orders?.length || 0} total</p>
        </div>
        <button onClick={() => { setForm({ status: 'RECEIVED' }); setModal({ open: true, type: 'new' }); }} className="btn-primary">+ New Intake</button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', ...STATUS_STEPS.slice(0, 6)].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Equipment', 'Technician', 'Intake', 'Status', 'Description', 'Price', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o: any) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{o.equipment?.brand} {o.equipment?.model}</div>
                  <div className="text-xs text-gray-400 font-mono">{o.equipment?.serial}</div>
                </td>
                <td className="px-4 py-3 text-gray-500">{o.technician ? `${o.technician.firstName} ${o.technician.lastName}` : '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(o.intakeAt).toLocaleDateString()}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{o.description || '—'}</td>
                <td className="px-4 py-3">{o.priceCents > 0 ? `₪${(o.priceCents/100).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm({ status: o.status, priceCents: o.priceCents, diagnosis: o.diagnosis, notes: o.notes }); setModal({ open: true, type: 'update', data: o }); }} className="btn-ghost text-xs">Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-2">🔧</div><div>No service orders</div></div>
        )}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, type: 'new' })} title={modal.type === 'new' ? 'New Service Intake' : 'Update Service Order'}>
        <div className="space-y-4">
          {modal.type === 'new' && (
            <div>
              <label className="label">Equipment</label>
              <select className="input" value={form.equipmentId || ''} onChange={set('equipmentId')}>
                <option value="">Select equipment</option>
                {(equipment || []).map((e: any) => <option key={e.id} value={e.id}>{e.brand} {e.model} ({e.serial})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status || 'RECEIVED'} onChange={set('status')}>
              {STATUS_STEPS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          {modal.type === 'new' && (
            <div><label className="label">Description / Complaint</label><textarea className="input" rows={3} value={form.description || ''} onChange={set('description')} /></div>
          )}
          <div><label className="label">Diagnosis / Notes</label><textarea className="input" rows={3} value={form.diagnosis || form.notes || ''} onChange={set('diagnosis')} /></div>
          <div><label className="label">Price (₪)</label><input className="input" type="number" value={form.priceCents ? form.priceCents / 100 : ''} onChange={e => setForm((f: any) => ({ ...f, priceCents: Math.round(parseFloat(e.target.value || '0') * 100) }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal({ open: false, type: 'new' })} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
