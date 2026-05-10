import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Button, Badge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Spinner, Alert, StatCard } from '../components/ui/index.jsx';

const STATUS_COLORS = { scheduled: 'blue', completed: 'green', cancelled: 'red', 'no-show': 'gray' };
const PAY_COLORS = { pending: 'yellow', paid: 'green', refunded: 'gray' };

export default function Flights() {
  const [flights, setFlights] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => Promise.all([api.flights({ status: filterStatus }), api.flightStats()])
    .then(([f, s]) => { setFlights(f); setStats(s); }).finally(() => setLoading(false));

  useEffect(load, [filterStatus]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal.data) await api.updateFlight(modal.data.id, form);
      else await api.createFlight(form);
      setModal(null); setForm({}); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this flight?')) return;
    await api.deleteFlight(id); load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <PageHeader
        title="Experience Flights"
        subtitle="Tandem and joy ride bookings"
        action={<Button size="sm" onClick={() => { setForm({ status: 'scheduled', payment_status: 'pending', flight_date: new Date().toISOString().slice(0, 10) }); setModal({ data: null }); }}>+ Book Flight</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Flights" value={stats.count || 0} icon="✈️" color="blue" />
        <StatCard label="Revenue" value={`₪${stats.revenue?.toLocaleString() || 0}`} icon="💰" color="green" />
        <StatCard label="Upcoming" value={stats.upcomingCount || 0} icon="📅" color="sky" />
        <StatCard label="Completed" value={stats.byStatus?.find(s => s.status === 'completed')?.count || 0} icon="✅" color="purple" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'scheduled', 'completed', 'cancelled', 'no-show'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Passenger</th><th>Pilot</th><th>Date</th><th>Duration</th><th>Location</th><th>Status</th><th>Payment</th><th></th></tr></thead>
          <tbody>
            {flights.map(f => (
              <tr key={f.id}>
                <td>
                  <div className="font-medium">{f.passenger_name}</div>
                  <div className="text-xs text-gray-400">{f.passenger_email}</div>
                </td>
                <td className="text-sm">{f.pilot_name}</td>
                <td className="text-sm whitespace-nowrap">{f.flight_date}</td>
                <td className="text-sm">{f.duration_minutes ? `${f.duration_minutes} min` : '—'}</td>
                <td className="text-xs text-gray-500">{f.takeoff_location}</td>
                <td><Badge color={STATUS_COLORS[f.status]}>{f.status}</Badge></td>
                <td>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">₪{f.price}</span>
                    <Badge color={PAY_COLORS[f.payment_status]}>{f.payment_status}</Badge>
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setForm(f); setModal({ data: f }); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(f.id)} className="text-red-500">Del</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {flights.length === 0 && <EmptyState icon="✈️" title="No flights" description="Book tandem experience flights for passengers." action={<Button onClick={() => { setForm({}); setModal({ data: null }); }}>Book Flight</Button>} />}
      </div>

      <Modal open={!!modal} onClose={() => { setModal(null); setForm({}); }} title={modal?.data ? 'Edit Flight' : 'Book Flight'} maxWidth="max-w-2xl">
        {error && <Alert type="error" message={error} className="mb-4" />}
        <div className="space-y-4">
          <Input label="Passenger Name" value={form.passenger_name || ''} onChange={set('passenger_name')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Passenger Email" type="email" value={form.passenger_email || ''} onChange={set('passenger_email')} />
            <Input label="Passenger Phone" value={form.passenger_phone || ''} onChange={set('passenger_phone')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Flight Date" type="date" value={form.flight_date || ''} onChange={set('flight_date')} required />
            <Input label="Duration (minutes)" type="number" value={form.duration_minutes || ''} onChange={set('duration_minutes')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Takeoff Location" value={form.takeoff_location || ''} onChange={set('takeoff_location')} />
            <Input label="Landing Location" value={form.landing_location || ''} onChange={set('landing_location')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Status" value={form.status || 'scheduled'} onChange={set('status')}>
              {['scheduled','completed','cancelled','no-show'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input label="Price (₪)" type="number" value={form.price || ''} onChange={set('price')} />
            <Select label="Payment" value={form.payment_status || 'pending'} onChange={set('payment_status')}>
              {['pending','paid','refunded'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Textarea label="Notes" value={form.notes || ''} onChange={set('notes')} rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
