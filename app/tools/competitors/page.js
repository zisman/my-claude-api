'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { JsonViewer, ErrorAlert, LoadingSpinner } from '../../../components/ResultPanel';

export default function CompetitorAnalysis() {
  const [form, setForm] = useState({ yourBrand: '', yourDescription: '', industry: '', analysisDepth: 'standard' });
  const [competitors, setCompetitors] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedComp, setSelectedComp] = useState(0);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setComp = (i, v) => setCompetitors(cs => { const a = [...cs]; a[i] = v; return a; });
  const addComp = () => competitors.length < 5 && setCompetitors(cs => [...cs, '']);
  const removeComp = i => setCompetitors(cs => cs.filter((_, j) => j !== i));

  async function analyze() {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, competitors: competitors.filter(Boolean) }),
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

  const comp = result?.competitors?.[selectedComp];

  return (
    <ToolLayout icon="🥊" title="Competitor Intelligence" description="Real web-fetched competitor analysis with battle cards, positioning gaps, and strategic recommendations.">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Your Brand *</label>
              <input className="input" placeholder="Acme Inc." value={form.yourBrand} onChange={set('yourBrand')} />
            </div>
            <div>
              <label className="label">Your Product Description *</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="What you do and who you serve…" value={form.yourDescription} onChange={set('yourDescription')} />
            </div>
            <div>
              <label className="label">Industry</label>
              <input className="input" placeholder="e.g. CRM Software, Marketing Automation" value={form.industry} onChange={set('industry')} />
            </div>
            <div>
              <label className="label">Analysis Depth</label>
              <div className="flex gap-2">
                {['quick', 'standard', 'deep'].map(d => (
                  <button key={d} onClick={() => setForm(f => ({ ...f, analysisDepth: d }))}
                    className={`flex-1 py-2 rounded text-xs font-medium border transition-all capitalize
                      ${form.analysisDepth === d ? 'bg-brand-600/20 border-brand-500/40 text-brand-300' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <label className="label mb-3">Competitors (URLs or Names)</label>
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input flex-1" placeholder={`Competitor ${i + 1} URL or name`}
                    value={c} onChange={e => setComp(i, e.target.value)} />
                  {competitors.length > 1 && (
                    <button onClick={() => removeComp(i)} className="text-slate-600 hover:text-red-400 transition-colors px-2">✕</button>
                  )}
                </div>
              ))}
              {competitors.length < 5 && (
                <button onClick={addComp} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">+ Add competitor</button>
              )}
            </div>
          </div>

          <button className="btn-primary w-full" onClick={analyze}
            disabled={!form.yourBrand || !form.yourDescription || !competitors.filter(Boolean).length || loading}>
            {loading ? 'Analyzing…' : '✦ Analyze Competitors'}
          </button>
          {loading && <LoadingSpinner label={`Claude is fetching and analyzing ${competitors.filter(Boolean).length} competitor${competitors.filter(Boolean).length > 1 ? 's' : ''}…`} />}
          <ErrorAlert error={error} />
        </div>

        <div className="space-y-4">
          {result?.executive_summary && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">🏆 Executive Summary</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{result.executive_summary.competitive_landscape}</p>
              <div className="space-y-2">
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Biggest Opportunity</p>
                  <p className="text-xs text-slate-300">{result.executive_summary.biggest_opportunity}</p>
                </div>
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Biggest Threat</p>
                  <p className="text-xs text-slate-300">{result.executive_summary.biggest_threat}</p>
                </div>
              </div>
            </div>
          )}

          {result?.competitors?.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {result.competitors.map((c, i) => (
                  <button key={i} onClick={() => setSelectedComp(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${selectedComp === i ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-card text-slate-400 border-surface-border hover:text-white'}`}>
                    {c.name}
                  </button>
                ))}
              </div>

              {comp && (
                <div className="card animate-fade-in space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white">{comp.name}</h3>
                      <p className="text-xs text-slate-500">{comp.target_market}</p>
                    </div>
                    <span className={`tag text-[10px] border
                      ${comp.category === 'Direct' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        comp.category === 'Indirect' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-sky-500/10 border-sky-500/20 text-sky-400'}`}>
                      {comp.category}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-surface border border-surface-border">
                    <p className="text-[10px] text-slate-500 mb-1">Hero Headline</p>
                    <p className="text-xs text-white italic">"{comp.messaging_analysis?.hero_headline}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-400 uppercase mb-1">Strengths</p>
                      <ul className="space-y-1">
                        {comp.strengths?.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <span className="text-emerald-500 mt-0.5">+</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-red-400 uppercase mb-1">Weaknesses</p>
                      <ul className="space-y-1">
                        {comp.weaknesses?.slice(0, 3).map((w, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <span className="text-red-500 mt-0.5">−</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {comp.battle_card && (
                    <details>
                      <summary className="text-xs font-semibold text-brand-400 cursor-pointer">⚔️ Battle Card</summary>
                      <div className="mt-2 space-y-2">
                        {comp.battle_card.your_counter_talking_points?.map((p, i) => (
                          <p key={i} className="text-xs text-slate-400 flex gap-2">
                            <span className="text-brand-500">→</span>{p}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
          )}

          {result?.strategic_recommendations && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">🎯 Strategic Recommendations</h3>
              <div className="space-y-2">
                {result.strategic_recommendations.immediate_actions?.slice(0, 4).map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`tag text-[10px] flex-shrink-0 mt-0.5
                      ${a.impact === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {a.impact}
                    </span>
                    <span className="text-slate-300">{a.action}</span>
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
