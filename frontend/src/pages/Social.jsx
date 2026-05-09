import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { Sparkles, Send, Calendar, BarChart2, Plus, Facebook, Instagram, MessageCircle, Globe, Loader, X, Edit2, Trash2, TrendingUp } from 'lucide-react';

const POST_TYPES = { general: 'כללי', event: 'אירוע', promo: 'מבצע', achievement: 'הישג', weather: 'מזג אוויר', course: 'קורס' };
const STATUS_COLORS = { draft: 'bg-gray-100 text-gray-600', scheduled: 'bg-blue-100 text-blue-700', published: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700' };
const STATUS_LABELS = { draft: 'טיוטה', scheduled: 'מתוזמן', published: 'פורסם', failed: 'נכשל' };

const TOPICS = [
  'פתיחת עונת טיסות חדשה',
  'קורס P1 חדש נפתח להרשמה',
  'תנאי טיסה מושלמים היום',
  'תלמיד סיים קורס ועף לראשונה',
  'אירוע מיוחד במועדון',
  'ציוד חדש הגיע למחסן',
  'טיסת חוויה מהממת של לקוח',
  'טורניר/תחרות קרובה',
  'תמונת/וידאו טיסה מרהיבה',
  'טיפ בטיחות שבועי',
];

function PlatformIcon({ platform, size = 16 }) {
  if (platform === 'facebook') return <Facebook size={size} className="text-blue-600" />;
  if (platform === 'instagram') return <Instagram size={size} className="text-pink-600" />;
  if (platform === 'whatsapp') return <MessageCircle size={size} className="text-green-600" />;
  return <Globe size={size} />;
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}

// ---- AI Post Generator ----
function GeneratorTab({ onPostSaved }) {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('facebook');
  const [saving, setSaving] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram', 'whatsapp']);

  const generate = async () => {
    const t = customTopic || topic;
    if (!t) return;
    setLoading(true);
    setGenerated(null);
    try {
      const result = await api.post('/social/generate', { topic: t });
      setGenerated(result);
    } catch (err) {
      alert('שגיאה ביצירת פוסט: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async (status) => {
    if (!generated) return;
    setSaving(true);
    try {
      await api.post('/social/posts', {
        title: customTopic || topic,
        content_facebook: generated.facebook?.content,
        content_instagram: generated.instagram?.content,
        content_whatsapp: generated.whatsapp?.content,
        post_type: 'general',
        platforms: selectedPlatforms.join(','),
        hashtags: JSON.stringify(generated.facebook?.hashtags || []),
        image_suggestion: generated.image_suggestion,
        ai_generated: true,
        status,
        scheduled_at: status === 'scheduled' ? new Date(Date.now() + 3600000).toISOString().slice(0, 16) : null,
      });
      onPostSaved();
      alert(status === 'published' ? 'הפוסט פורסם!' : 'הפוסט נשמר כטיוטה');
    } catch (err) {
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const getContent = () => {
    if (!generated) return '';
    if (activeTab === 'facebook') return generated.facebook?.content || '';
    if (activeTab === 'instagram') return `${generated.instagram?.content || ''}\n\n${(generated.instagram?.hashtags || []).join(' ')}`;
    if (activeTab === 'whatsapp') return generated.whatsapp?.content || '';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Topic selector */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" /> בחר נושא לפוסט
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {TOPICS.map(t => (
            <button key={t} onClick={() => { setTopic(t); setCustomTopic(''); }}
              className={`text-sm px-3 py-2 rounded-lg border text-right transition-colors ${topic === t && !customTopic ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50'}`}>
              {t}
            </button>
          ))}
        </div>
        <div>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="או הקלד נושא מותאם אישית..."
            value={customTopic} onChange={e => { setCustomTopic(e.target.value); setTopic(''); }} />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-sm text-slate-600">פרסם ל:</span>
          {['facebook', 'instagram', 'whatsapp'].map(p => (
            <button key={p} onClick={() => togglePlatform(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${selectedPlatforms.includes(p) ? 'border-sky-500 bg-sky-50' : 'border-slate-200 text-slate-400'}`}>
              <PlatformIcon platform={p} />
              {p === 'facebook' ? 'פייסבוק' : p === 'instagram' ? 'אינסטגרם' : 'וואטסאפ'}
            </button>
          ))}
        </div>
        <button onClick={generate} disabled={loading || (!topic && !customTopic)}
          className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-medium">
          {loading ? <><Loader size={16} className="animate-spin" /> יוצר פוסט...</> : <><Sparkles size={16} /> צור פוסט עם AI</>}
        </button>
      </div>

      {/* Generated content */}
      {generated && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-medium text-slate-700 mb-4">הפוסט שנוצר</h4>
          <div className="flex gap-2 mb-4">
            {['facebook', 'instagram', 'whatsapp'].map(p => (
              <button key={p} onClick={() => setActiveTab(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${activeTab === p ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}>
                <PlatformIcon platform={p} />
                {p === 'facebook' ? 'פייסבוק' : p === 'instagram' ? 'אינסטגרם' : 'וואטסאפ'}
              </button>
            ))}
          </div>

          <div className={`rounded-xl p-4 mb-4 text-sm leading-relaxed whitespace-pre-line ${activeTab === 'facebook' ? 'bg-blue-50 border border-blue-100' : activeTab === 'instagram' ? 'bg-pink-50 border border-pink-100' : 'bg-green-50 border border-green-100'}`}>
            {getContent()}
          </div>

          {activeTab === 'facebook' && generated.facebook?.hashtags && (
            <div className="flex flex-wrap gap-1 mb-4">
              {generated.facebook.hashtags.map((h, i) => (
                <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{h}</span>
              ))}
            </div>
          )}

          {generated.image_suggestion && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-4">
              <span className="font-medium text-amber-800">תמונה מוצעת: </span>
              <span className="text-amber-700">{generated.image_suggestion}</span>
            </div>
          )}

          {generated.best_time && (
            <div className="text-xs text-slate-500 mb-4">⏰ זמן מומלץ לפרסום: {generated.best_time}</div>
          )}

          {generated.campaign_tip && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm mb-4">
              <span className="font-medium text-purple-800">טיפ: </span>
              <span className="text-purple-700">{generated.campaign_tip}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => save('published')} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              <Send size={14} /> פרסם עכשיו
            </button>
            <button onClick={() => save('draft')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">
              שמור טיוטה
            </button>
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">
              <Sparkles size={14} /> צור שוב
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Calendar Tab ----
function CalendarTab({ onRefresh }) {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    const q = filter !== 'all' ? `?status=${filter}` : '';
    api.get(`/social/posts${q}`).then(setPosts);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const publish = async (id) => {
    await api.post(`/social/posts/${id}/publish`);
    load();
  };

  const del = async (id) => {
    if (!confirm('למחוק פוסט זה?')) return;
    await api.delete(`/social/posts/${id}`);
    load();
    onRefresh();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'scheduled', 'published'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${filter === s ? 'bg-sky-600 text-white border-sky-600' : 'bg-white border-slate-200'}`}>
            {s === 'all' ? 'הכל' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status]}`}>{STATUS_LABELS[post.status]}</span>
                <span className="text-xs text-slate-400">{POST_TYPES[post.post_type] || post.post_type}</span>
                {post.ai_generated ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={10} /> AI</span> : null}
              </div>
              <div className="flex gap-1">
                {post.status === 'draft' && (
                  <button onClick={() => publish(post.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">פרסם</button>
                )}
                <button onClick={() => del(post.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="text-sm text-slate-700 line-clamp-2 mb-2">{post.content_facebook || post.content_instagram || post.content_whatsapp}</div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex gap-2">
                {(post.platforms || '').split(',').map(p => p.trim()).filter(Boolean).map(p => (
                  <PlatformIcon key={p} platform={p} size={14} />
                ))}
              </div>
              <div className="flex gap-3">
                {post.scheduled_at && <span>מתוזמן: {post.scheduled_at?.slice(0, 10)}</span>}
                {post.likes > 0 && <span>❤️ {post.likes}</span>}
                {post.reach > 0 && <span>👁 {post.reach.toLocaleString()}</span>}
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <div>אין פוסטים עדיין — צור פוסט עם AI</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Campaigns Tab ----
function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', objective: 'leads', platform: 'facebook', budget: '', start_date: '', end_date: '' });

  useEffect(() => { api.get('/social/campaigns').then(setCampaigns); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post('/social/campaigns', form);
    setShowAdd(false);
    api.get('/social/campaigns').then(setCampaigns);
  };

  const del = async (id) => {
    if (!confirm('למחוק קמפיין?')) return;
    await api.delete(`/social/campaigns/${id}`);
    api.get('/social/campaigns').then(setCampaigns);
  };

  const objectives = { awareness: 'מודעות', leads: 'לידים', conversions: 'המרות', engagement: 'מעורבות' };
  const platforms = { facebook: 'פייסבוק', instagram: 'אינסטגרם', tiktok: 'טיקטוק', google: 'גוגל', multi: 'רב-פלטפורמה' };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-slate-700">קמפיינים</h4>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
          <Plus size={14} /> קמפיין חדש
        </button>
      </div>

      <div className="space-y-3">
        {campaigns.map(c => {
          const roi = c.leads_generated > 0 && c.spent > 0 ? (c.spent / c.leads_generated).toFixed(0) : null;
          return (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {platforms[c.platform] || c.platform} · {objectives[c.objective] || c.objective}
                    {c.start_date && ` · ${c.start_date} — ${c.end_date || '?'}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.status === 'active' ? 'פעיל' : 'הסתיים'}
                  </span>
                  <button onClick={() => del(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="font-bold text-slate-800">₪{Number(c.budget).toLocaleString()}</div>
                  <div className="text-xs text-slate-400">תקציב</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="font-bold text-red-700">₪{Number(c.spent).toLocaleString()}</div>
                  <div className="text-xs text-slate-400">הוצא</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="font-bold text-sky-700">{c.leads_generated}</div>
                  <div className="text-xs text-slate-400">לידים</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="font-bold text-green-700">{roi ? `₪${roi}` : '—'}</div>
                  <div className="text-xs text-slate-400">עלות/ליד</div>
                </div>
              </div>
              {c.impressions > 0 && (
                <div className="mt-2 text-xs text-slate-400 flex gap-4">
                  <span>👁 {c.impressions.toLocaleString()} חשיפות</span>
                  <span>🖱 {c.clicks} קליקים</span>
                  <span>CTR: {c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : 0}%</span>
                </div>
              )}
            </div>
          );
        })}
        {campaigns.length === 0 && <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">אין קמפיינים</div>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">קמפיין חדש</h3>
              <button onClick={() => setShowAdd(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={save} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-600 mb-1">שם הקמפיין *</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">מטרה</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={form.objective} onChange={e => setForm({...form, objective: e.target.value})}>
                    {Object.entries(objectives).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">פלטפורמה</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
                    {Object.entries(platforms).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">תקציב ₪</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">תאריך התחלה</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-sky-600 text-white px-5 py-2 rounded-lg hover:bg-sky-700">שמור</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Analytics Tab ----
function AnalyticsTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/social/analytics').then(setStats); }, []);

  if (!stats) return <div className="text-center py-12 text-slate-400">טוען...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'סה"כ פוסטים', value: stats.total_posts, sub: `${stats.published} פורסמו` },
          { label: 'חשיפה כוללת', value: stats.total_reach?.toLocaleString(), sub: 'טווח הגעה' },
          { label: 'לייקים', value: stats.total_likes, sub: `${stats.total_shares} שיתופים` },
          { label: 'תקציב קמפיינים', value: `₪${stats.total_budget?.toLocaleString()}`, sub: `₪${stats.total_spent?.toLocaleString()} הוצא` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
            {s.sub && <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {stats.top_posts?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp size={16} /> הפוסטים המובילים
          </h4>
          <div className="space-y-3">
            {stats.top_posts.map(post => (
              <div key={post.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <div className="flex-1 ml-4">
                  <div className="text-slate-700 line-clamp-1">{post.content_facebook || post.content_instagram}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{post.published_at?.slice(0, 10)}</div>
                </div>
                <div className="flex gap-4 text-xs text-slate-500 shrink-0">
                  <span>❤️ {post.likes}</span>
                  <span>👁 {post.reach?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.by_type?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-medium text-slate-700 mb-3">ביצועים לפי סוג פוסט</h4>
          <div className="space-y-2 text-sm">
            {stats.by_type.map(row => (
              <div key={row.post_type} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-slate-700">{POST_TYPES[row.post_type] || row.post_type}</span>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>{row.count} פוסטים</span>
                  <span>❤️ {row.likes}</span>
                  <span>👁 {row.reach?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----
export default function Social() {
  const [tab, setTab] = useState('generator');
  const [refresh, setRefresh] = useState(0);

  const onPostSaved = () => setRefresh(r => r + 1);

  return (
    <div className="p-6 animate-fade-in" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">מדיה חברתית</h1>
        <p className="text-slate-500 text-sm">ניהול תוכן, קמפיינים ויצירת פוסטים עם AI</p>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 mb-6 text-white flex items-center gap-3">
        <Sparkles size={24} />
        <div>
          <div className="font-bold">AI Post Generator מופעל</div>
          <div className="text-sm text-purple-100">Claude יוצר תוכן מותאם לפייסבוק, אינסטגרם ווואטסאפ — בהתבסס על נתוני המועדון בזמן אמת</div>
        </div>
      </div>

      <div className="flex border-b mb-6 overflow-x-auto">
        <TabBtn active={tab === 'generator'} onClick={() => setTab('generator')}>
          <span className="flex items-center gap-1"><Sparkles size={14} /> יוצר פוסטים AI</span>
        </TabBtn>
        <TabBtn active={tab === 'calendar'} onClick={() => setTab('calendar')}>
          <span className="flex items-center gap-1"><Calendar size={14} /> לוח תוכן</span>
        </TabBtn>
        <TabBtn active={tab === 'campaigns'} onClick={() => setTab('campaigns')}>
          <span className="flex items-center gap-1"><Globe size={14} /> קמפיינים</span>
        </TabBtn>
        <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')}>
          <span className="flex items-center gap-1"><BarChart2 size={14} /> אנליטיקה</span>
        </TabBtn>
      </div>

      {tab === 'generator' && <GeneratorTab onPostSaved={onPostSaved} />}
      {tab === 'calendar' && <CalendarTab key={refresh} onRefresh={onPostSaved} />}
      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
