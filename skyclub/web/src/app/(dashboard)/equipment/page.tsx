'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RENTED: 'bg-blue-100 text-blue-700',
  IN_SERVICE: 'bg-yellow-100 text-yellow-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
  SOLD: 'bg-gray-100 text-gray-600',
};

const TYPE_ICONS: Record<string, string> = {
  WING: '🪂', HARNESS: '🪑', RESERVE: '⛑️', HELMET: '🪖', RADIO: '📻', ENGINE: '⚙️', TRIKE: '🛺', OTHER: '📦',
};

function Modal({ open, onClose, title, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  const { data: items, mutate } = useSWR('equipment', () => api.equipment.list());
  const { data: stats } = useSWR('equipment-stats', () => api.equipment.stats());
  const [modal, setModal] = useState<{ open: boolean; data?: any }>({ open: false });
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await api.equipment.update(modal.data.id, form);
      else await api.equipment.create(form);
      setModal({ open: false });
      mutate();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const filtered = (items || []).filter((i: any) => !filterStatus || i.status === filterStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-sm text-gray-500">{stats?.total || 0} items · {stats?.available || 0} available</p>
        </div>
        <button onClick={() => { setForm({ status: 'AVAILABLE', ownerType: 'CLUB' }); setModal({ open: true }); }} className="btn-primary">
          + Add Equipment
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats?.total || 0, color: 'bg-gray-50' },
          { label: 'Available', value: stats?.available || 0, color: 'bg-green-50' },
          { label: 'In Service', value: stats?.inService || 0, color: 'bg-yellow-50' },
          { label: 'Open Orders', value: stats?.openServiceOrders || 0, color: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 border border-gray-100`}>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'AVAILABLE', 'RENTED', 'IN_SERVICE', 'OUT_OF_SERVICE'].map(s => (
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
              {['Equipment', 'Type', 'Serial', 'Usage', 'Status', 'Next Refresh', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: any) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{TYPE_ICONS[item.type]} {item.brand} {item.model}</div>
                  <div className="text-xs text-gray-400">{item.ownerType}</div>
                </td>
                <td className="px-4 py-3 capitalize text-gray-500">{item.type}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.serial || '—'}</td>
                <td className="px-4 py-3">{item.usageHours?.toFixed(0)}h</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_COLORS[item.status] || 'bg-gray-100'}`}>{item.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{item.nextRefresh ? new Date(item.nextRefresh).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(item); setModal({ open: true, data: item }); }} className="btn-ghost text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🪂</div>
            <div>No equipment found</div>
          </div>
        )}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.data ? 'Edit Equipment' : 'Add Equipment'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type || ''} onChange={set('type')}>
                <option value="">Select type</option>
                {['WING','HARNESS','RESERVE','HELMET','RADIO','ENGINE','TRIKE','OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status || 'AVAILABLE'} onChange={set('status')}>
                {['AVAILABLE','RENTED','IN_SERVICE','OUT_OF_SERVICE','SOLD'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Brand</label><input className="input" value={form.brand || ''} onChange={set('brand')} /></div>
            <div><label className="label">Model</label><input className="input" value={form.model || ''} onChange={set('model')} /></div>
          </div>
          <div><label className="label">Serial Number</label><input className="input" value={form.serial || ''} onChange={set('serial')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Purchase Date</label><input className="input" type="date" value={form.purchaseDate?.slice(0,10) || ''} onChange={set('purchaseDate')} /></div>
            <div><label className="label">Usage Hours</label><input className="input" type="number" step="0.1" value={form.usageHours || 0} onChange={set('usageHours')} /></div>
          </div>
          <div><label className="label">Next Refresh</label><input className="input" type="date" value={form.nextRefresh?.slice(0,10) || ''} onChange={set('nextRefresh')} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal({ open: false })} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
