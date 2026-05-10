import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Button, Badge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Spinner, Alert } from '../components/ui/index.jsx';

const LEVEL_COLORS = { beginner: 'green', intermediate: 'blue', advanced: 'orange', tandem: 'purple' };
const STATUS_COLORS = { draft: 'yellow', active: 'green', completed: 'gray', cancelled: 'red' };

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [enrollModal, setEnrollModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');

  const load = () => Promise.all([api.courses(), api.students()]).then(([c, s]) => { setCourses(c); setStudents(s); }).finally(() => setLoading(false));
  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal.data) await api.updateCourse(modal.data.id, form);
      else await api.createCourse(form);
      setModal(null); setForm({}); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openDetail = async (c) => {
    const data = await api.course(c.id);
    setDetailModal(data);
  };

  const enroll = async () => {
    if (!selectedStudent) return;
    try {
      await api.enrollStudent(enrollModal.id, { student_id: selectedStudent });
      setEnrollModal(null); setSelectedStudent('');
      if (detailModal?.id === enrollModal.id) {
        const data = await api.course(enrollModal.id);
        setDetailModal(data);
      }
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle={`${courses.length} courses · ${courses.filter(c => c.status === 'active').length} active`}
        action={<Button size="sm" onClick={() => { setForm({ status: 'draft', level: 'beginner' }); setModal({ data: null }); }}>+ New Course</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map(c => (
          <div key={c.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(c)}>
            <div className="flex items-start justify-between mb-3">
              <Badge color={LEVEL_COLORS[c.level] || 'gray'}>{c.level}</Badge>
              <Badge color={STATUS_COLORS[c.status] || 'gray'}>{c.status}</Badge>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{c.name}</h3>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.description}</p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>👤 {c.instructor_name}</div>
              <div>📅 {c.start_date} → {c.end_date}</div>
              <div>👥 {c.enrolled_count || 0}/{c.max_students} students</div>
              {c.price && <div>₪{c.price?.toLocaleString()} · {c.duration_days} days</div>}
            </div>
            <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
              <Button variant="secondary" size="sm" onClick={() => { setForm(c); setModal({ data: c }); }}>Edit</Button>
              <Button size="sm" onClick={() => setEnrollModal(c)}>Enroll</Button>
            </div>
          </div>
        ))}
        {courses.length === 0 && <div className="md:col-span-2 xl:col-span-3"><EmptyState icon="🎓" title="No courses yet" action={<Button onClick={() => { setForm({}); setModal({ data: null }); }}>Create Course</Button>} /></div>}
      </div>

      <Modal open={!!modal} onClose={() => { setModal(null); setForm({}); }} title={modal?.data ? 'Edit Course' : 'New Course'} maxWidth="max-w-2xl">
        {error && <Alert type="error" message={error} className="mb-4" />}
        <div className="space-y-4">
          <Input label="Course Name" value={form.name || ''} onChange={set('name')} required />
          <Textarea label="Description" value={form.description || ''} onChange={set('description')} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Level" value={form.level || 'beginner'} onChange={set('level')}>
              {['beginner','intermediate','advanced','tandem'].map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Select label="Status" value={form.status || 'draft'} onChange={set('status')}>
              {['draft','active','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Duration (days)" type="number" value={form.duration_days || ''} onChange={set('duration_days')} />
            <Input label="Price (₪)" type="number" value={form.price || ''} onChange={set('price')} />
            <Input label="Max Students" type="number" value={form.max_students || ''} onChange={set('max_students')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date || ''} onChange={set('start_date')} />
            <Input label="End Date" type="date" value={form.end_date || ''} onChange={set('end_date')} />
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
            <div className="flex gap-2">
              <Badge color={LEVEL_COLORS[detailModal.level]}>{detailModal.level}</Badge>
              <Badge color={STATUS_COLORS[detailModal.status]}>{detailModal.status}</Badge>
            </div>
            <p className="text-sm text-gray-600">{detailModal.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Instructor:</span> {detailModal.instructor_name}</div>
              <div><span className="text-gray-500">Duration:</span> {detailModal.duration_days} days</div>
              <div><span className="text-gray-500">Dates:</span> {detailModal.start_date} → {detailModal.end_date}</div>
              <div><span className="text-gray-500">Price:</span> ₪{detailModal.price?.toLocaleString()}</div>
            </div>
            <h3 className="font-semibold">Enrollments ({detailModal.enrollments?.length || 0}/{detailModal.max_students})</h3>
            <div className="space-y-2">
              {detailModal.enrollments?.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium">{e.student_name}</div>
                    <div className="text-xs text-gray-500">{e.student_email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={e.status === 'completed' ? 'green' : e.status === 'enrolled' ? 'blue' : 'gray'}>{e.status}</Badge>
                  </div>
                </div>
              ))}
              {!detailModal.enrollments?.length && <div className="text-sm text-gray-400 text-center py-3">No students enrolled</div>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!enrollModal} onClose={() => { setEnrollModal(null); setSelectedStudent(''); }} title={`Enroll in ${enrollModal?.name}`}>
        <div className="space-y-4">
          <Select label="Select Student" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
            <option value="">Choose a student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEnrollModal(null)}>Cancel</Button>
            <Button onClick={enroll} disabled={!selectedStudent}>Enroll</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
