import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Button, Badge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Spinner, Alert } from '../components/ui/index.jsx';

const LICENSE_COLORS = { P1: 'blue', P2: 'sky', P3: 'green', P4: 'purple' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => api.students().then(setStudents).finally(() => setLoading(false));
  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal.data) await api.updateStudent(modal.data.id, form);
      else await api.createStudent(form);
      setModal(null); setForm({}); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openDetail = async (s) => {
    const data = await api.student(s.id);
    setDetailModal(data);
  };

  const remove = async (id) => {
    if (!confirm('Delete student?')) return;
    await api.deleteStudent(id); load();
  };

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${students.length} students`}
        action={<Button size="sm" onClick={() => { setForm({}); setModal({ data: null }); }}>+ Add Student</Button>}
      />

      <div className="mb-4">
        <input className="input max-w-sm" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Name</th><th>Contact</th><th>License</th><th>Flights</th><th>Hours</th><th></th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="font-medium cursor-pointer hover:text-brand-600" onClick={() => openDetail(s)}>{s.name}</div>
                  <div className="text-xs text-gray-400">{s.email}</div>
                </td>
                <td className="text-sm text-gray-600">{s.phone}</td>
                <td>{s.license_level ? <Badge color={LICENSE_COLORS[s.license_level] || 'gray'}>{s.license_level}</Badge> : '—'}</td>
                <td>{s.total_flights}</td>
                <td>{s.total_hours?.toFixed(1)}h</td>
                <td>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setForm(s); setModal({ data: s }); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s.id)} className="text-red-500">Del</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="👥" title="No students found" description="Add students to track their progress and enrollments." action={<Button onClick={() => { setForm({}); setModal({ data: null }); }}>Add Student</Button>} />}
      </div>

      <Modal open={!!modal} onClose={() => { setModal(null); setForm({}); }} title={modal?.data ? 'Edit Student' : 'Add Student'}>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <div className="space-y-4">
          <Input label="Full Name" value={form.name || ''} onChange={set('name')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email || ''} onChange={set('email')} />
            <Input label="Phone" value={form.phone || ''} onChange={set('phone')} />
          </div>
          <Input label="Date of Birth" type="date" value={form.date_of_birth || ''} onChange={set('date_of_birth')} />
          <Input label="Emergency Contact" placeholder="Name: phone" value={form.emergency_contact || ''} onChange={set('emergency_contact')} />
          <Textarea label="Medical Info" value={form.medical_info || ''} onChange={set('medical_info')} rows={2} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="License Level" value={form.license_level || ''} onChange={set('license_level')}>
              <option value="">None</option>
              {['P1','P2','P3','P4'].map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Input label="Total Flights" type="number" value={form.total_flights || ''} onChange={set('total_flights')} />
            <Input label="Total Hours" type="number" step="0.1" value={form.total_hours || ''} onChange={set('total_hours')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.name} maxWidth="max-w-2xl">
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Email:</span> {detailModal.email || '—'}</div>
              <div><span className="text-gray-500">Phone:</span> {detailModal.phone || '—'}</div>
              <div><span className="text-gray-500">License:</span> {detailModal.license_level || '—'}</div>
              <div><span className="text-gray-500">Flights:</span> {detailModal.total_flights} · {detailModal.total_hours}h</div>
              <div><span className="text-gray-500">Emergency:</span> {detailModal.emergency_contact || '—'}</div>
              <div><span className="text-gray-500">Medical:</span> {detailModal.medical_info || '—'}</div>
            </div>
            {detailModal.enrollments?.length > 0 && (
              <>
                <h3 className="font-semibold text-gray-900">Course Enrollments</h3>
                <div className="space-y-2">
                  {detailModal.enrollments.map(e => (
                    <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <div className="text-sm font-medium">{e.course_name}</div>
                        <div className="text-xs text-gray-500">{e.level} · {e.start_date}</div>
                      </div>
                      <Badge color={e.status === 'completed' ? 'green' : e.status === 'enrolled' ? 'blue' : 'gray'}>{e.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
