'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { JsonViewer, ErrorAlert, LoadingSpinner } from '../../../components/ResultPanel';

const PLATFORMS = ['instagram', 'linkedin', 'twitter', 'tiktok', 'facebook', 'youtube'];
const GOALS = ['brand_awareness', 'lead_generation', 'community', 'sales', 'thought_leadership'];

export default function SocialPlanner() {
  const [form, setForm] = useState({
    brand: '', industry: '', description: '', targetAudience: '',
    tone: 'professional', postsPerWeek: 5, contentPillars: '',
  });
  const [platforms, setPlatforms] = useState(['instagram', 'linkedin']);
  const [goals, setGoals] = useState(['brand_awareness']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleArr = (arr, set, val) => set(a => a.includes(val) ? a.filter(x => x !== val) : [...a, val]);

  async function generate() {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/social-media-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          platforms,
          goals,
          contentPillars: form.contentPillars ? form.contentPillars.split(',').map(s => s.trim()) : [],
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'complete' && event.data) setResult(event.data);
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const weeks = result?.weeks || [];
  const currentWeek = weeks[selectedWeek];
  const currentDay = currentWeek?.days?.[selectedDay];

  return (
    <ToolLayout icon="📅" title="30-Day Social Calendar" description="Full month of platform-specific posts with ready-to-publish captions, hooks, and hashtag strategy.">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Brand Name *</label>
              <input className="input" placeholder="Acme Inc." value={form.brand} onChange={set('brand')} />
            </div>
            <div>
              <label className="label">Industry *</label>
              <input className="input" placeholder="e.g. B2B SaaS, E-commerce, Health" value={form.industry} onChange={set('industry')} />
            </div>
            <div>
              <label className="label">Brand Description *</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="What your brand does…" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Target Audience</label>
              <input className="input" placeholder="Who you're talking to" value={form.targetAudience} onChange={set('targetAudience')} />
            </div>
            <div>
              <label className="label">Content Pillars (comma-separated, optional)</label>
              <input className="input" placeholder="e.g. Education, Behind the scenes, Customer stories" value={form.contentPillars} onChange={set('contentPillars')} />
            </div>
            <div>
              <label className="label">Brand Tone</label>
              <select className="input" value={form.tone} onChange={set('tone')}>
                {['professional', 'playful', 'educational', 'inspirational', 'bold'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Posts Per Week ({form.postsPerWeek})</label>
              <input type="range" min="3" max="7" value={form.postsPerWeek}
                onChange={e => setForm(f => ({ ...f, postsPerWeek: Number(e.target.value) }))}
                className="w-full accent-brand-500" />
            </div>
          </div>

          <div className="card">
            <label className="label mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => toggleArr(platforms, setPlatforms, p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize
                    ${platforms.includes(p) ? 'bg-brand-600/20 border-brand-500/40 text-brand-300' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <label className="label mb-2">Goals</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g} onClick={() => toggleArr(goals, setGoals, g)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-all
                    ${goals.includes(g) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
                  {g.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full" onClick={generate}
            disabled={!form.brand || !form.industry || !form.description || !platforms.length || loading}>
            {loading ? 'Generating calendar…' : '✦ Generate 30-Day Calendar'}
          </button>
          {loading && <LoadingSpinner label="Claude is planning your entire month of content…" />}
          <ErrorAlert error={error} />
        </div>

        <div className="space-y-4">
          {result?.strategy_overview && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-2">🧭 Strategy</h3>
              <p className="text-xs text-slate-400 mb-2">{result.strategy_overview.brand_voice}</p>
              <p className="text-xs text-slate-300 mb-3">Theme: <span className="text-brand-400">{result.strategy_overview.monthly_theme}</span></p>
              <div className="flex flex-wrap gap-1">
                {result.strategy_overview.content_pillars?.map(p => (
                  <span key={p.name} className="tag bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px]">{p.name} ({p.percentage_of_content}%)</span>
                ))}
              </div>
            </div>
          )}

          {weeks.length > 0 && (
            <>
              <div className="flex gap-2">
                {weeks.map((w, i) => (
                  <button key={i} onClick={() => { setSelectedWeek(i); setSelectedDay(0); }}
                    className={`flex-1 py-2 rounded text-xs font-medium border transition-all
                      ${selectedWeek === i ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-card text-slate-400 border-surface-border hover:text-white'}`}>
                    Week {w.week}
                  </button>
                ))}
              </div>

              {currentWeek && (
                <div className="card animate-fade-in">
                  <p className="text-xs font-semibold text-brand-400 mb-3">Theme: {currentWeek.theme}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {currentWeek.days?.map((d, i) => (
                      <button key={i} onClick={() => setSelectedDay(i)}
                        className={`px-2 py-1 rounded text-[10px] font-medium border transition-all
                          ${selectedDay === i ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
                        Day {d.day}
                      </button>
                    ))}
                  </div>

                  {currentDay && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">{currentDay.date_placeholder}</p>
                      {currentDay.posts?.map((post, i) => (
                        <div key={i} className="p-3 rounded-lg bg-surface border border-surface-border space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="tag bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] capitalize">{post.platform}</span>
                              <span className="tag bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px]">{post.content_type}</span>
                            </div>
                            <span className={`tag text-[10px] ${post.estimated_reach_potential === 'Viral' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' : 'bg-surface-hover border-surface-border text-slate-500'}`}>
                              {post.estimated_reach_potential}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-white">{post.hook}</p>
                          <p className="text-xs text-slate-400 leading-relaxed">{post.caption}</p>
                          <div className="flex flex-wrap gap-1">
                            {post.hashtags?.slice(0, 5).map(h => (
                              <span key={h} className="text-[10px] text-sky-400">{h}</span>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 italic">{post.visual_concept}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {result && <JsonViewer data={result} />}
        </div>
      </div>
    </ToolLayout>
  );
}
