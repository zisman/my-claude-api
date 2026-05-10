'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

const LEVEL_COLORS: Record<string, string> = {
  INTRO: 'bg-blue-100 text-blue-700', BASIC: 'bg-green-100 text-green-700',
  ADVANCED: 'bg-orange-100 text-orange-700', PARAMOTOR: 'bg-purple-100 text-purple-700', TRIKE: 'bg-pink-100 text-pink-700',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700', CANCELLED: 'bg-red-100 text-red-700',
};

function Modal({ open, onClose, title, children, wide }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const { data: courses, mutate } = useSWR('courses', () => api.courses.list());
  const { data: students } = useSWR('students', () => api.students.list());
  const [modal, setModal] = useState<{ open: boolean; data?: any }>({ open: false });
  const [detailModal, setDetailModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, priceCents: Math.round((form.price || 0) * 100) };
      if (modal.data) await api.courses.update(modal.data.id, payload);
      else await api.courses.create(payload);
      setModal({ open: false });
      mutate();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const openDetail = async (c: any) => {
    const data = await api.courses.get(c.id);
    setDetailModal(data);
  };

  const enroll = async () => {
    if (!enrollStudentId || !detailModal) return;
    try {
      await api.courses.enroll(detailModal.id, enrollStudentId);
      const data = await api.courses.get(detailModal.id);
      setDetailModal(data);
      setEnrollStudentId('');
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500">{courses?.length || 0} total</p>
        </div>
        <button onClick={() => { setForm({ status: 'DRAFT', level: 'BASIC' }); setModal({ open: true }); }} className="btn-primary">+ New Course</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(courses || []).map((c: any) => (
          <div key={c.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(c)}>
            <div className="flex justify-between mb-3">
              <span className={`badge ${LEVEL_COLORS[c.level] || 'bg-gray-100'}`}>{c.level}</span>
              <span className={`badge ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{c.title}</h3>
            <p className="text-xs text-gray-400 line-clamp-2 mb-3">{c.description}</p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>📅 {formatDate(c.startDate)}{c.endDate ? ` → ${formatDate(c.endDate)}` : ''}</div>
              <div>👥 {c._count?.enrollments || 0}/{c.maxStudents} enrolled</div>
              {c.priceCents > 0 && <div>₪{(c.priceCents / 100).toLocaleString()}</div>}
            </div>
            <div className="mt-4" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setForm({ ...c, price: c.priceCents / 100, startDate: c.startDate?.slice(0,10), endDate: c.endDate?.slice(0,10) }); setModal({ open: true, data: c }); }} className="btn-secondary text-xs">Edit</button>
            </div>
          </div>
        ))}
        {(courses || []).length === 0 && (
          <div className="md:col-span-3 text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🎓</div><div>No courses yet</div>
          </div>
        )}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.data ? 'Edit Course' : 'New Course'}>
        <div className="space-y-4">
          <div><label className="label">Title</label><input className="input" value={form.title || ''} onChange={set('title')} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description || ''} onChange={set('description')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Level</label>
              <select className="input" value={form.level || 'BASIC'} onChange={set('level')}>
                {['INTRO','BASIC','ADVANCED','PARAMOTOR','TRIKE'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="input" value={form.status || 'DRAFT'} onChange={set('status')}>
                {['DRAFT','ACTIVE','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Price (₪)</label><input className="input" type="number" value={form.price || ''} onChange={set('price')} /></div>
            <div><label className="label">Max Students</label><input className="input" type="number" value={form.maxStudents || 10} onChange={set('maxStudents')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label><input className="input" type="date" value={form.startDate || ''} onChange={set('startDate')} /></div>
            <div><label className="label">End Date</label><input className="input" type="date" value={form.endDate || ''} onChange={set('endDate')} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal({ open: false })} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.title} wide>
        {detailModal && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className={`badge ${LEVEL_COLORS[detailModal.level]}`}>{detailModal.level}</span>
              <span className={`badge ${STATUS_COLORS[detailModal.status]}`}>{detailModal.status}</span>
            </div>
            <p className="text-sm text-gray-600">{detailModal.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Start:</span> {formatDate(detailModal.startDate)}</div>
              <div><span className="text-gray-500">Price:</span> {formatCurrency(detailModal.priceCents)}</div>
              <div><span className="text-gray-500">Capacity:</span> {detailModal.enrollments?.length}/{detailModal.maxStudents}</div>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Enrollments ({detailModal.enrollments?.length})</h3>
              <div className="space-y-2 mb-4">
                {detailModal.enrollments?.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span>{e.student?.firstName} {e.student?.lastName}</span>
                    <span className={`badge ${e.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{e.status}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <select className="input flex-1 text-sm" value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)}>
                  <option value="">Enroll a student...</option>
                  {(students || []).map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
                <button onClick={enroll} disabled={!enrollStudentId} className="btn-primary text-sm">Enroll</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
