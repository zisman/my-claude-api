'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PROSPECT: 'bg-blue-100 text-blue-700',
  GRADUATED: 'bg-purple-100 text-purple-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DROPPED: 'bg-red-100 text-red-700',
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

export default function StudentsPage() {
  const { data: students, mutate } = useSWR('students', () => api.students.list());
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; data?: any }>({ open: false });
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setForm({ status: 'PROSPECT' }); setModal({ open: true }); };
  const openEdit = (s: any) => { setForm(s); setModal({ open: true, data: s }); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await api.students.update(modal.data.id, form);
      else await api.students.create(form);
      setModal({ open: false });
      mutate();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    await api.students.delete(id);
    mutate();
  };

  const filtered = (students || []).filter((s: any) =>
    !search || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{students?.length || 0} total</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Add Student</button>
      </div>

      <div className="mb-4">
        <input className="input max-w-sm" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Email', 'Phone', 'License', 'Flights', 'Hours', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                <td className="px-4 py-3">{s.licenseLevel || '—'}</td>
                <td className="px-4 py-3">{s.totalFlights}</td>
                <td className="px-4 py-3">{s.totalHours?.toFixed(1)}h</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="btn-ghost text-xs">Edit</button>
                    <button onClick={() => remove(s.id)} className="btn-ghost text-xs text-red-500">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">👥</div>
            <div>No students found</div>
          </div>
        )}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.data ? 'Edit Student' : 'Add Student'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name</label><input className="input" value={form.firstName || ''} onChange={set('firstName')} /></div>
            <div><label className="label">Last Name</label><input className="input" value={form.lastName || ''} onChange={set('lastName')} /></div>
          </div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email || ''} onChange={set('email')} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone || ''} onChange={set('phone')} /></div>
          <div><label className="label">Date of Birth</label><input className="input" type="date" value={form.dateOfBirth?.slice(0, 10) || ''} onChange={set('dateOfBirth')} /></div>
          <div><label className="label">Emergency Contact</label><input className="input" placeholder="Name: phone" value={form.emergencyContact || ''} onChange={set('emergencyContact')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status || 'PROSPECT'} onChange={set('status')}>
                {['PROSPECT','ACTIVE','PAUSED','GRADUATED','DROPPED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">License Level</label>
              <select className="input" value={form.licenseLevel || ''} onChange={set('licenseLevel')}>
                <option value="">None</option>
                {['P1','P2','P3','P4'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Total Flights</label><input className="input" type="number" value={form.totalFlights || 0} onChange={set('totalFlights')} /></div>
            <div><label className="label">Total Hours</label><input className="input" type="number" step="0.1" value={form.totalHours || 0} onChange={set('totalHours')} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal({ open: false })} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
