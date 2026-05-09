'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { JsonViewer, ErrorAlert, LoadingSpinner } from '../../../components/ResultPanel';

const GOALS = ['revenue', 'leads', 'brand', 'market_share', 'retention'];

export default function MarketingStrategy() {
  const [form, setForm] = useState({
    brand: '', product: '', description: '', targetAudience: '',
    stage: 'growth', monthlyBudget: '', uniqueValue: '', geography: 'US',
    timeframe: '90_days',
  });
  const [goals, setGoals] = useState(['revenue', 'leads']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [streamText, setStreamText] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function generate() {
    setLoading(true); setError(''); setResult(null); setStreamText('');
    try {
      const res = await fetch('/api/marketing-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, goals, monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : undefined }),
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
            if (event.type === 'text') setStreamText(t => t + event.text);
            if (event.type === 'complete' && event.data) { setResult(event.data); setStreamText(''); }
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout icon="🚀" title="GTM Strategy Generator" description="Investor-grade go-to-market strategy with positioning, channels, funnel, budget, and 90-day action plan.">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Brand *</label>
                <input className="input" placeholder="Acme Inc." value={form.brand} onChange={set('brand')} />
              </div>
              <div>
                <label className="label">Product *</label>
                <input className="input" placeholder="Product name" value={form.product} onChange={set('product')} />
              </div>
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="What it does and key benefits…" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Target Audience (ICP) *</label>
              <input className="input" placeholder="e.g. Growth marketers at Series A-C SaaS companies" value={form.targetAudience} onChange={set('targetAudience')} />
            </div>
            <div>
              <label className="label">Unique Value Proposition</label>
              <input className="input" placeholder="Your core differentiator" value={form.uniqueValue} onChange={set('uniqueValue')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Company Stage</label>
                <select className="input" value={form.stage} onChange={set('stage')}>
                  {['pre-launch', 'launch', 'growth', 'scale', 'mature'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Timeframe</label>
                <select className="input" value={form.timeframe} onChange={set('timeframe')}>
                  {[['30_days', '30 days'], ['90_days', '90 days'], ['6_months', '6 months'], ['12_months', '12 months']].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Monthly Budget ($)</label>
                <input className="input" type="number" placeholder="e.g. 10000" value={form.monthlyBudget} onChange={set('monthlyBudget')} />
              </div>
              <div>
                <label className="label">Geography</label>
                <input className="input" placeholder="e.g. US, Global, EMEA" value={form.geography} onChange={set('geography')} />
              </div>
            </div>
          </div>

          <div className="card">
            <label className="label mb-2">Primary Goals</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g} onClick={() => setGoals(gs => gs.includes(g) ? gs.filter(x => x !== g) : [...gs, g])}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-all
                    ${goals.includes(g) ? 'bg-brand-600/20 border-brand-500/40 text-brand-300' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
                  {g.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full" onClick={generate}
            disabled={!form.brand || !form.product || !form.description || !form.targetAudience || loading}>
            {loading ? 'Generating strategy…' : '✦ Generate GTM Strategy'}
          </button>
          {loading && <LoadingSpinner label="Claude is building your go-to-market strategy…" />}
          <ErrorAlert error={error} />
        </div>

        <div className="space-y-4">
          {streamText && !result && (
            <div className="card animate-fade-in">
              <p className="text-xs text-slate-500 mb-2">Generating…</p>
              <pre className="result-block text-[11px] max-h-96 streaming-cursor">{streamText}</pre>
            </div>
          )}

          {result?.executive_summary && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-2">📊 Executive Summary</h3>
              <p className="text-xs text-slate-300 mb-2">{result.executive_summary.strategic_thesis}</p>
              <p className="text-xs text-brand-400 font-medium">{result.executive_summary.winning_strategy}</p>
            </div>
          )}

          {result?.positioning_strategy && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-2">🎯 Positioning</h3>
              <p className="text-xs text-slate-300 italic mb-3">"{result.positioning_strategy.positioning_statement}"</p>
              <p className="text-xs text-slate-500">Archetype: <span className="text-slate-300">{result.positioning_strategy.brand_archetype}</span></p>
            </div>
          )}

          {result?.channel_strategy?.recommended_channels?.length > 0 && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">📡 Channel Strategy</h3>
              <div className="space-y-2">
                {result.channel_strategy.recommended_channels.slice(0, 5).map((ch, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`tag text-[10px] flex-shrink-0 ${ch.priority === 'Primary' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                      {ch.priority}
                    </span>
                    <div>
                      <span className="font-medium text-white">{ch.channel}</span>
                      <span className="text-slate-500 ml-2">{ch.budget_allocation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result?.action_plan && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-3">📅 Action Plan</h3>
              {[['week_1_2', 'Week 1-2'], ['month_1', 'Month 1'], ['month_2_3', 'Month 2-3']].map(([key, label]) => {
                const section = result.action_plan[key];
                if (!section) return null;
                return (
                  <details key={key} className="mb-2">
                    <summary className="text-xs font-semibold text-slate-300 cursor-pointer hover:text-white">
                      {label}: {section.theme}
                    </summary>
                    <ul className="mt-1.5 ml-3 space-y-1">
                      {section.tasks?.slice(0, 5).map((t, i) => (
                        <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                          <span className="text-brand-600">▸</span>{t}
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          )}

          {result && <JsonViewer data={result} />}
        </div>
      </div>
    </ToolLayout>
  );
}
