'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { ScoreBar, GradeBadge, JsonViewer, ErrorAlert, LoadingSpinner, IssuesList } from '../../../components/ResultPanel';

export default function SeoOptimizer() {
  const [form, setForm] = useState({ url: '', content: '', targetKeywords: '', industry: '', pageType: 'landing', locale: 'en-US' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('url');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function analyze() {
    setLoading(true); setError(''); setResult(null);
    const body = {
      ...form,
      url: tab === 'url' ? form.url : undefined,
      content: tab === 'content' ? form.content : undefined,
      targetKeywords: form.targetKeywords ? form.targetKeywords.split(',').map(s => s.trim()) : [],
    };
    try {
      const res = await fetch('/api/seo-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    <ToolLayout icon="🎯" title="SEO Optimizer" description="Full SEO audit with keyword analysis, technical fixes, schema markup, and content rewrite suggestions.">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card">
            {/* Tab toggle */}
            <div className="flex gap-2 mb-4">
              {['url', 'content'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all
                    ${tab === t ? 'bg-brand-600 text-white' : 'bg-surface text-slate-400 hover:text-white'}`}>
                  {t === 'url' ? '🔗 Analyze URL' : '📝 Analyze Content'}
                </button>
              ))}
            </div>

            {tab === 'url' ? (
              <div className="mb-4">
                <label className="label">Page URL *</label>
                <input className="input" placeholder="https://example.com/page" value={form.url} onChange={set('url')} />
              </div>
            ) : (
              <div className="mb-4">
                <label className="label">Page Content *</label>
                <textarea className="input min-h-[120px] resize-none" placeholder="Paste the full page text/HTML here…" value={form.content} onChange={set('content')} />
              </div>
            )}

            <div className="mb-4">
              <label className="label">Target Keywords (comma-separated)</label>
              <input className="input" placeholder="e.g. CRM software, sales automation" value={form.targetKeywords} onChange={set('targetKeywords')} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Industry</label>
                <input className="input" placeholder="e.g. SaaS, E-commerce" value={form.industry} onChange={set('industry')} />
              </div>
              <div>
                <label className="label">Page Type</label>
                <select className="input" value={form.pageType} onChange={set('pageType')}>
                  {['homepage', 'landing', 'blog', 'product', 'category', 'local'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Locale</label>
              <select className="input" value={form.locale} onChange={set('locale')}>
                {['en-US', 'en-GB', 'he-IL', 'de-DE', 'fr-FR', 'es-ES'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={analyze} disabled={(!form.url && !form.content) || loading}>
            {loading ? 'Analyzing…' : '✦ Analyze SEO'}
          </button>
          {loading && <LoadingSpinner label="Running SEO analysis…" />}
          <ErrorAlert error={error} />
        </div>

        <div className="space-y-4">
          {result?.page_overview && (
            <div className="card animate-slide-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white">{result.page_overview.title}</h3>
                  <p className="text-xs text-slate-500">{result.page_overview.page_type} · {result.page_overview.primary_topic}</p>
                </div>
                <GradeBadge grade={result.page_overview.seo_grade} />
              </div>
              <ScoreBar label="Overall SEO Score" score={result.page_overview.overall_seo_score} />
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-slate-500">Words: <span className="text-white">{result.page_overview.word_count}</span></span>
                <span className="text-slate-500">Potential: <span className="text-white">{result.page_overview.current_ranking_potential}</span></span>
              </div>
            </div>
          )}

          {result?.on_page_seo?.title_tag && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">📝 Title Tag</h3>
              <p className="text-xs text-slate-500 mb-1">Current:</p>
              <p className="text-xs text-slate-300 mb-2 bg-surface p-2 rounded">{result.on_page_seo.title_tag.current || 'Not found'}</p>
              <p className="text-xs text-slate-500 mb-1">Optimized:</p>
              <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                {result.on_page_seo.title_tag.optimized_version}
              </p>
            </div>
          )}

          {result?.on_page_seo?.meta_description && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">🏷️ Meta Description</h3>
              <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                {result.on_page_seo.meta_description.optimized_version}
              </p>
            </div>
          )}

          {result?.action_plan?.immediate_wins?.length > 0 && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">⚡ Immediate Wins</h3>
              <div className="space-y-2">
                {result.action_plan.immediate_wins.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`tag text-[10px] flex-shrink-0 mt-0.5
                      ${w.impact === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        w.impact === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                      {w.impact}
                    </span>
                    <span className="text-xs text-slate-300">{w.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result?.technical_seo?.schema_markup?.schema_code && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">🔗 Schema Markup to Add</h3>
              <pre className="result-block text-[11px] max-h-48">{result.technical_seo.schema_markup.schema_code}</pre>
            </div>
          )}

          {result && <JsonViewer data={result} />}
        </div>
      </div>
    </ToolLayout>
  );
}
