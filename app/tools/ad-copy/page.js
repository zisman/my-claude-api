'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { JsonViewer, ErrorAlert, LoadingSpinner } from '../../../components/ResultPanel';

const PLATFORMS = ['google', 'meta', 'linkedin', 'tiktok', 'youtube'];
const PLATFORM_ICONS = { google: '🔎', meta: '👤', linkedin: '💼', tiktok: '🎵', youtube: '▶️' };

export default function AdCopyGenerator() {
  const [form, setForm] = useState({
    product: '', description: '', targetAudience: '', uniqueValue: '',
    tone: 'professional', goal: 'leads', budget: '',
  });
  const [platforms, setPlatforms] = useState(['google', 'meta']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const togglePlatform = p => setPlatforms(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]);

  async function generate() {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/generate-ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, platforms }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout icon="📣" title="Ad Copy Generator" description="Platform-optimized ad copy for Google, Meta, LinkedIn, TikTok, and YouTube using Claude Opus 4.7.">
      <div className="grid grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Product / Service *</label>
              <input className="input" placeholder="e.g. Acme CRM" value={form.product} onChange={set('product')} />
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="What it does and its key benefits…" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Target Audience</label>
              <input className="input" placeholder="e.g. B2B sales teams at SaaS startups" value={form.targetAudience} onChange={set('targetAudience')} />
            </div>
            <div>
              <label className="label">Unique Value Proposition</label>
              <input className="input" placeholder="What makes you different?" value={form.uniqueValue} onChange={set('uniqueValue')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tone</label>
                <select className="input" value={form.tone} onChange={set('tone')}>
                  {['professional', 'playful', 'urgent', 'inspirational', 'bold', 'conversational'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Campaign Goal</label>
                <select className="input" value={form.goal} onChange={set('goal')}>
                  {['leads', 'sales', 'awareness', 'app_installs', 'demo_booking'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Monthly Budget (hint)</label>
              <input className="input" placeholder="e.g. $5,000/month" value={form.budget} onChange={set('budget')} />
            </div>
          </div>

          {/* Platforms */}
          <div className="card">
            <label className="label mb-3">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                    ${platforms.includes(p)
                      ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                      : 'bg-surface border-surface-border text-slate-500 hover:text-slate-300'}`}
                >
                  {PLATFORM_ICONS[p]} {p}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full" onClick={generate} disabled={!form.product || !form.description || !platforms.length || loading}>
            {loading ? 'Generating…' : '✦ Generate Ad Copy'}
          </button>

          {loading && <LoadingSpinner label="Claude is crafting platform-optimized ad copy…" />}
          <ErrorAlert error={error} />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result?.campaign_brief && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">📋 Campaign Brief</h3>
              <div className="space-y-2">
                <p className="text-xs text-slate-300"><span className="text-slate-500">Core message:</span> {result.campaign_brief.core_message}</p>
                <p className="text-xs text-slate-300"><span className="text-slate-500">Hook:</span> {result.campaign_brief.emotional_hook}</p>
                <p className="text-xs text-slate-300"><span className="text-slate-500">Insight:</span> {result.campaign_brief.audience_insight}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.campaign_brief.key_benefits?.map((b, i) => (
                    <span key={i} className="tag bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result?.platforms && Object.entries(result.platforms).map(([platform, data]) => (
            <div key={platform} className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">
                {PLATFORM_ICONS[platform]} {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </h3>
              <pre className="result-block text-[11px] max-h-64">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ))}

          {result?.budget_allocation_suggestion && (
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-3">💰 Budget Allocation</h3>
              <div className="space-y-1">
                {Object.entries(result.budget_allocation_suggestion).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-400 capitalize">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && <JsonViewer data={result} />}
        </div>
      </div>
    </ToolLayout>
  );
}
