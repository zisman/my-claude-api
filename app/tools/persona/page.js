'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { JsonViewer, ErrorAlert, LoadingSpinner } from '../../../components/ResultPanel';

const COMPANY_SIZES = ['solo', 'smb', 'mid_market', 'enterprise', 'all'];

export default function CustomerPersona() {
  const [form, setForm] = useState({
    product: '', description: '', industry: '', existingCustomers: '',
    jobTitles: '', companySize: 'all', useCase: '', personaCount: 3, researchContext: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(0);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function generate() {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/customer-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          jobTitles: form.jobTitles ? form.jobTitles.split(',').map(s => s.trim()) : [],
          personaCount: Number(form.personaCount),
        }),
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

  const personas = result?.personas || [];
  const persona = personas[selectedPersona];

  return (
    <ToolLayout icon="👤" title="Buyer Persona Builder" description="Jobs-to-be-Done personas with pain points, buying triggers, objections, and messaging guides.">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Product / Service *</label>
              <input className="input" placeholder="Acme Analytics" value={form.product} onChange={set('product')} />
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="What it does, key benefits, who it's for…" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Industry *</label>
              <input className="input" placeholder="e.g. Marketing SaaS, E-commerce, Healthcare" value={form.industry} onChange={set('industry')} />
            </div>
            <div>
              <label className="label">Use Case</label>
              <input className="input" placeholder="Primary problem you solve" value={form.useCase} onChange={set('useCase')} />
            </div>
            <div>
              <label className="label">Target Job Titles (comma-separated)</label>
              <input className="input" placeholder="e.g. CMO, Head of Growth, Marketing Manager" value={form.jobTitles} onChange={set('jobTitles')} />
            </div>
            <div>
              <label className="label">Company Size Target</label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_SIZES.map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, companySize: s }))}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-all
                      ${form.companySize === s ? 'bg-brand-600/20 border-brand-500/40 text-brand-300' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Existing Customer Notes (optional)</label>
              <textarea className="input min-h-[60px] resize-none" placeholder="What you know about your current customers…" value={form.existingCustomers} onChange={set('existingCustomers')} />
            </div>
            <div>
              <label className="label">Qualitative Research (optional)</label>
              <textarea className="input min-h-[60px] resize-none" placeholder="Customer interview quotes, survey findings, reviews…" value={form.researchContext} onChange={set('researchContext')} />
            </div>
            <div>
              <label className="label">Number of Personas ({form.personaCount})</label>
              <input type="range" min="1" max="4" value={form.personaCount}
                onChange={e => setForm(f => ({ ...f, personaCount: e.target.value }))}
                className="w-full accent-brand-500" />
            </div>
          </div>

          <button className="btn-primary w-full" onClick={generate}
            disabled={!form.product || !form.description || !form.industry || loading}>
            {loading ? 'Building personas…' : `✦ Build ${form.personaCount} Persona${form.personaCount > 1 ? 's' : ''}`}
          </button>
          {loading && <LoadingSpinner label="Claude is researching and building your buyer personas…" />}
          <ErrorAlert error={error} />
        </div>

        <div className="space-y-4">
          {result?.icp_summary && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-2">🎯 ICP Summary</h3>
              <p className="text-xs text-slate-400 mb-2">{result.icp_summary.strategic_insight}</p>
              <div className="flex gap-3 text-xs text-slate-500">
                <span>Primary buyer: <span className="text-white">{result.icp_summary.primary_buyer}</span></span>
              </div>
            </div>
          )}

          {personas.length > 0 && (
            <>
              <div className="flex gap-2">
                {personas.map((p, i) => (
                  <button key={i} onClick={() => setSelectedPersona(i)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all
                      ${selectedPersona === i ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-card text-slate-400 border-surface-border hover:text-white'}`}>
                    <span className={`tag text-[9px] mb-1 block ${i === 0 ? 'bg-brand-500/20 text-brand-400 border-brand-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                      {p.priority}
                    </span>
                    {p.nickname}
                  </button>
                ))}
              </div>

              {persona && (
                <div className="card animate-fade-in space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{persona.persona_name}</h3>
                    <p className="text-xs text-brand-400">{persona.nickname}</p>
                    <p className="text-xs text-slate-500">{persona.professional_profile?.title} · {persona.professional_profile?.company_type}</p>
                  </div>

                  <blockquote className="border-l-2 border-brand-500/40 pl-3 italic text-xs text-slate-300">
                    "{persona.quote}"
                  </blockquote>

                  {persona.pain_points?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top Pain Points</p>
                      <div className="space-y-1.5">
                        {persona.pain_points.slice(0, 3).map((p, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="flex-shrink-0 mt-1">
                              <div className="h-1.5 w-10 bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(p.severity / 10) * 100}%` }} />
                              </div>
                            </div>
                            <p className="text-xs text-slate-400">{p.pain}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {persona.messaging_guide && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Messaging Guide</p>
                      <div className="p-2 rounded bg-surface border border-surface-border mb-2">
                        <p className="text-xs font-semibold text-white">{persona.messaging_guide.headline_that_resonates}</p>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">Hook: <span className="text-slate-300">{persona.messaging_guide.emotional_hook}</span></p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {persona.messaging_guide.words_they_use?.slice(0, 4).map(w => (
                          <span key={w} className="tag bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">"{w}"</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {persona.buying_behavior?.objections?.length > 0 && (
                    <details>
                      <summary className="text-xs font-semibold text-slate-300 cursor-pointer">🛡️ Common Objections</summary>
                      <div className="mt-2 space-y-2">
                        {persona.buying_behavior.objections.slice(0, 3).map((o, i) => (
                          typeof o === 'object' ? (
                            <div key={i} className="p-2 rounded bg-surface border border-surface-border">
                              <p className="text-xs text-red-400 mb-0.5">"{o.objection}"</p>
                              <p className="text-xs text-emerald-400">{o.rebuttal}</p>
                            </div>
                          ) : (
                            <p key={i} className="text-xs text-slate-400">{o}</p>
                          )
                        ))}
                      </div>
                    </details>
                  )}

                  {persona.day_in_the_life && (
                    <details>
                      <summary className="text-xs font-semibold text-slate-300 cursor-pointer">📖 Day in the Life</summary>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed">{persona.day_in_the_life}</p>
                    </details>
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
