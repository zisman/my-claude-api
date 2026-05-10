import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Button, Badge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Spinner, Alert } from '../components/ui/index.jsx';

const STATUS_COLORS = { draft: 'yellow', active: 'green', completed: 'gray', paused: 'orange' };
const TYPE_ICONS = { email: '📧', sms: '📱', social: '📢', event: '🎉', other: '📌' };

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState([]);

  const load = () => api.campaigns().then(setCampaigns).finally(() => setLoading(false));
  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal.data) await api.updateCampaign(modal.data.id, form);
      else await api.createCampaign(form);
      setModal(null); setForm({}); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openDetail = async (c) => {
    const data = await api.campaign(c.id);
    setDetailModal(data);
  };

  const generateIdeas = async () => {
    setAiLoading(true);
    try {
      const result = await api.campaignIdeas({
        goal: form.target_audience || 'grow membership',
        targetAudience: form.target_audience,
        budget: form.budget,
      });
      setAiIdeas(result.ideas || []);
    } catch (e) { setError('AI unavailable: ' + e.message); }
    finally { setAiLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <PageHeader
        title="Marketing Campaigns"
        subtitle={`${campaigns.length} campaigns`}
        action={<Button size="sm" onClick={() => { setForm({ type: 'social', status: 'draft' }); setModal({ data: null }); setAiIdeas([]); }}>+ New Campaign</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map(c => (
          <div key={c.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(c)}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{TYPE_ICONS[c.type] || '📌'}</span>
              <Badge color={STATUS_COLORS[c.status] || 'gray'}>{c.status}</Badge>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{c.name}</h3>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>🎯 {c.target_audience || 'General audience'}</div>
              {c.budget && <div>💰 ₪{c.budget?.toLocaleString()} budget</div>}
              <div>📅 {c.start_date} → {c.end_date || 'ongoing'}</div>
              <div>📝 {c.post_count || 0} posts</div>
            </div>
            <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
              <Button variant="secondary" size="sm" onClick={() => { setForm(c); setModal({ data: c }); setAiIdeas([]); }}>Edit</Button>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <div className="md:col-span-2 xl:col-span-3"><EmptyState icon="📢" title="No campaigns yet" description="Create marketing campaigns to grow your club." action={<Button onClick={() => { setForm({}); setModal({ data: null }); }}>New Campaign</Button>} /></div>}
      </div>

      <Modal open={!!modal} onClose={() => { setModal(null); setForm({}); setAiIdeas([]); }} title={modal?.data ? 'Edit Campaign' : 'New Campaign'} maxWidth="max-w-2xl">
        {error && <Alert type="error" message={error} className="mb-4" />}
        <div className="space-y-4">
          <Input label="Campaign Name" value={form.name || ''} onChange={set('name')} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type || 'social'} onChange={set('type')}>
              {['email','sms','social','event','other'].map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Status" value={form.status || 'draft'} onChange={set('status')}>
              {['draft','active','completed','paused'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Input label="Target Audience" placeholder="e.g. Adventure seekers 25-45" value={form.target_audience || ''} onChange={set('target_audience')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Budget (₪)" type="number" value={form.budget || ''} onChange={set('budget')} />
            <Input label="Start Date" type="date" value={form.start_date || ''} onChange={set('start_date')} />
            <Input label="End Date" type="date" value={form.end_date || ''} onChange={set('end_date')} />
          </div>
          <Textarea label="Campaign Brief" value={form.content || ''} onChange={set('content')} rows={3} />

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">✨ AI Campaign Ideas</span>
              <Button variant="secondary" size="sm" onClick={generateIdeas} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : 'Generate Ideas'}
              </Button>
            </div>
            {aiIdeas.map((idea, i) => (
              <div key={i} className="bg-blue-50 rounded-lg p-3 mb-2 text-sm">
                <div className="font-medium text-blue-900">{idea.name || `Idea ${i + 1}`}</div>
                <div className="text-blue-700 mt-1">{idea.description || JSON.stringify(idea)}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.name} maxWidth="max-w-xl">
        {detailModal && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge color={STATUS_COLORS[detailModal.status]}>{detailModal.status}</Badge>
              <span className="text-sm text-gray-500 capitalize">{detailModal.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Target:</span> {detailModal.target_audience || '—'}</div>
              <div><span className="text-gray-500">Budget:</span> {detailModal.budget ? `₪${detailModal.budget}` : '—'}</div>
              <div><span className="text-gray-500">Dates:</span> {detailModal.start_date} → {detailModal.end_date || 'ongoing'}</div>
              <div><span className="text-gray-500">Posts:</span> {detailModal.posts?.length || 0}</div>
            </div>
            {detailModal.content && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{detailModal.content}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
