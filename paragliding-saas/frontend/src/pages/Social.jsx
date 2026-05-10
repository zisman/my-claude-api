import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Button, Badge, Modal, Select, Textarea, PageHeader, EmptyState, Spinner, Alert, Input } from '../components/ui/index.jsx';

const PLATFORM_COLORS = { instagram: 'purple', facebook: 'blue', twitter: 'sky', linkedin: 'blue', whatsapp: 'green' };
const PLATFORM_ICONS = { instagram: '📸', facebook: '👤', twitter: '🐦', linkedin: '💼', whatsapp: '💬' };
const STATUS_COLORS = { draft: 'gray', scheduled: 'blue', published: 'green', failed: 'red' };

export default function Social() {
  const [posts, setPosts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ platform: 'instagram', status: 'draft' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ platform: 'instagram', topic: '', tone: 'enthusiastic' });
  const [filterPlatform, setFilterPlatform] = useState('');

  const load = () => Promise.all([api.posts({ platform: filterPlatform }), api.campaigns()])
    .then(([p, c]) => { setPosts(p); setCampaigns(c); }).finally(() => setLoading(false));
  useEffect(load, [filterPlatform]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setGen = (k) => (e) => setGenForm(f => ({ ...f, [k]: e.target.value }));

  const generate = async () => {
    setGenerating(true); setError('');
    try {
      const result = await api.generatePost(genForm);
      setForm(f => ({ ...f, content: result.content, platform: genForm.platform }));
    } catch (e) { setError('AI unavailable: ' + e.message); }
    finally { setGenerating(false); }
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal.data) await api.updatePost(modal.data.id, form);
      else await api.createPost(form);
      setModal(null); setForm({ platform: 'instagram', status: 'draft' }); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete post?')) return;
    await api.deletePost(id); load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <PageHeader
        title="Social Media"
        subtitle={`${posts.length} posts`}
        action={<Button size="sm" onClick={() => { setForm({ platform: 'instagram', status: 'draft' }); setGenForm({ platform: 'instagram', topic: '', tone: 'enthusiastic' }); setModal({ data: null }); }}>+ New Post</Button>}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'instagram', 'facebook', 'twitter', 'linkedin', 'whatsapp'].map(p => (
          <button key={p} onClick={() => setFilterPlatform(p)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterPlatform === p ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p ? `${PLATFORM_ICONS[p]} ${p}` : 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {posts.map(post => (
          <div key={post.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{PLATFORM_ICONS[post.platform]}</span>
                <Badge color={PLATFORM_COLORS[post.platform] || 'gray'}>{post.platform}</Badge>
              </div>
              <Badge color={STATUS_COLORS[post.status] || 'gray'}>{post.status}</Badge>
            </div>
            <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-line mb-3">{post.content}</p>
            <div className="text-xs text-gray-400 space-y-0.5">
              {post.ai_generated === 1 && <div>✨ AI generated</div>}
              {post.scheduled_at && <div>⏰ {new Date(post.scheduled_at).toLocaleString()}</div>}
              {post.published_at && <div>✅ Published {new Date(post.published_at).toLocaleDateString()}</div>}
              <div>by {post.author_name}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={() => { setForm(post); setModal({ data: post }); }}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => remove(post.id)} className="text-red-500">Delete</Button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="md:col-span-2 xl:col-span-3"><EmptyState icon="📱" title="No posts yet" description="Create social media posts with AI assistance." action={<Button onClick={() => { setForm({}); setModal({ data: null }); }}>Create Post</Button>} /></div>}
      </div>

      <Modal open={!!modal} onClose={() => { setModal(null); setForm({ platform: 'instagram', status: 'draft' }); }} title={modal?.data ? 'Edit Post' : 'New Post'} maxWidth="max-w-2xl">
        {error && <Alert type="error" message={error} className="mb-4" />}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
            <div className="text-sm font-medium text-gray-700 mb-3">✨ AI Content Generator</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Select value={genForm.platform} onChange={setGen('platform')}>
                {['instagram','facebook','twitter','linkedin','whatsapp'].map(p => <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>)}
              </Select>
              <Select value={genForm.tone} onChange={setGen('tone')}>
                {['enthusiastic','professional','fun','inspiring','informative'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" placeholder="Topic: e.g. weekend trip to Gilboa, new course launch..." value={genForm.topic} onChange={setGen('topic')} />
              <Button size="sm" onClick={generate} disabled={generating || !genForm.topic}>
                {generating ? '...' : 'Generate'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Platform" value={form.platform || 'instagram'} onChange={set('platform')}>
              {['instagram','facebook','twitter','linkedin','whatsapp'].map(p => <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>)}
            </Select>
            <Select label="Status" value={form.status || 'draft'} onChange={set('status')}>
              {['draft','scheduled','published'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Textarea label="Content" value={form.content || ''} onChange={set('content')} rows={6} required />
          {form.status === 'scheduled' && (
            <Input label="Schedule Date & Time" type="datetime-local" value={form.scheduled_at || ''} onChange={set('scheduled_at')} />
          )}
          <Select label="Campaign (optional)" value={form.campaign_id || ''} onChange={set('campaign_id')}>
            <option value="">No campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Post'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
