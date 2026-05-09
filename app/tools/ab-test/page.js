'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { JsonViewer, ErrorAlert, LoadingSpinner } from '../../../components/ResultPanel';

const ELEMENTS = [
  ['headline', 'Headline'],
  ['cta', 'CTA Button'],
  ['hero', 'Hero Section'],
  ['pricing', 'Pricing Page'],
  ['email_subject', 'Email Subject'],
  ['landing_page', 'Landing Page'],
  ['ad_copy', 'Ad Copy'],
  ['form', 'Form'],
];

const PRINCIPLES = {
  'Loss Aversion':    'bg-red-500/10 text-red-400 border-red-500/20',
  'Social Proof':     'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Curiosity Gap':    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'FOMO':             'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Reciprocity':      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Anchoring':        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

export default function AbTestVariants() {
  const [form, setForm] = useState({
    element: 'headline', currentVersion: '', context: '',
    goal: 'conversion', audience: '', variantCount: 3,
    testingPlatform: 'custom', currentConvRate: '', weeklyTraffic: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('control');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function generate() {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/ab-test-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          variantCount: Number(form.variantCount),
          currentConvRate: form.currentConvRate ? Number(form.currentConvRate) : undefined,
          weeklyTraffic: form.weeklyTraffic ? Number(form.weeklyTraffic) : undefined,
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

  const variants = result?.variants || [];
  const allOptions = result ? ['control', ...variants.map((_, i) => String(i))] : [];
  const currentDisplay = selectedVariant === 'control' ? result?.control : variants[Number(selectedVariant)];

  return (
    <ToolLayout icon="⚗️" title="A/B Test Variant Generator" description="Psychology-grounded CRO variants with sample size calculations, testing protocol, and follow-up roadmap.">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Element to Test</label>
              <div className="grid grid-cols-2 gap-2">
                {ELEMENTS.map(([value, label]) => (
                  <button key={value} onClick={() => setForm(f => ({ ...f, element: value }))}
                    className={`py-2 px-3 rounded text-xs font-medium border transition-all text-left
                      ${form.element === value ? 'bg-brand-600/20 border-brand-500/40 text-brand-300' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Current (Control) Version *</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="Paste your existing headline, CTA text, or copy…" value={form.currentVersion} onChange={set('currentVersion')} />
            </div>
            <div>
              <label className="label">Context *</label>
              <textarea className="input min-h-[60px] resize-none" placeholder="Describe the page/campaign context…" value={form.context} onChange={set('context')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Goal</label>
                <select className="input" value={form.goal} onChange={set('goal')}>
                  {['conversion', 'click', 'signup', 'purchase', 'engagement'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Variants ({form.variantCount})</label>
                <input type="range" min="2" max="6" value={form.variantCount}
                  onChange={e => setForm(f => ({ ...f, variantCount: e.target.value }))}
                  className="w-full mt-3 accent-brand-500" />
              </div>
            </div>
            <div>
              <label className="label">Target Audience</label>
              <input className="input" placeholder="Who sees this element" value={form.audience} onChange={set('audience')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Current Conv. Rate (%)</label>
                <input className="input" type="number" placeholder="e.g. 3.5" value={form.currentConvRate} onChange={set('currentConvRate')} />
              </div>
              <div>
                <label className="label">Weekly Traffic</label>
                <input className="input" type="number" placeholder="e.g. 5000" value={form.weeklyTraffic} onChange={set('weeklyTraffic')} />
              </div>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={generate}
            disabled={!form.currentVersion || !form.context || loading}>
            {loading ? 'Generating variants…' : `✦ Generate ${form.variantCount} Variants`}
          </button>
          {loading && <LoadingSpinner label="Claude is crafting psychology-driven variants…" />}
          <ErrorAlert error={error} />
        </div>

        <div className="space-y-4">
          {result?.test_strategy && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-2">📊 Test Setup</h3>
              <p className="text-xs text-slate-400 mb-3">{result.test_strategy.primary_hypothesis}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">Split: </span><span className="text-white">{result.test_strategy.recommended_traffic_split}</span></div>
                <div><span className="text-slate-500">Sample/variant: </span><span className="text-white">{result.test_strategy.sample_size_per_variant?.toLocaleString?.() || result.test_strategy.sample_size_per_variant}</span></div>
                <div><span className="text-slate-500">Duration: </span><span className="text-white">{result.test_strategy.estimated_test_duration}</span></div>
                <div><span className="text-slate-500">Significance: </span><span className="text-white">{result.test_strategy.statistical_significance_target}</span></div>
              </div>
            </div>
          )}

          {result && allOptions.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {allOptions.map((opt, i) => (
                  <button key={opt} onClick={() => setSelectedVariant(opt)}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-all
                      ${selectedVariant === opt ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-card text-slate-400 border-surface-border hover:text-white'}`}>
                    {opt === 'control' ? '🔒 Control' : `Variant ${String.fromCharCode(66 + Number(opt))}`}
                  </button>
                ))}
              </div>

              {currentDisplay && (
                <div className="card animate-fade-in space-y-3">
                  <div className="p-3 rounded-lg bg-surface border border-surface-border">
                    <p className="text-xs text-slate-500 mb-1">Copy</p>
                    <p className="text-sm font-semibold text-white">{currentDisplay.copy}</p>
                  </div>

                  {currentDisplay.psychological_principle && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Principle:</span>
                      <span className={`tag text-[10px] border ${PRINCIPLES[currentDisplay.psychological_principle] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {currentDisplay.psychological_principle}
                      </span>
                    </div>
                  )}

                  {currentDisplay.hypothesis && (
                    <p className="text-xs text-slate-400 italic">{currentDisplay.hypothesis}</p>
                  )}

                  {currentDisplay.rationale && (
                    <p className="text-xs text-slate-500">{currentDisplay.rationale}</p>
                  )}

                  {selectedVariant !== 'control' && currentDisplay.confidence && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Confidence of winning:</span>
                      <span className={`font-semibold ${currentDisplay.confidence === 'High' ? 'text-emerald-400' : currentDisplay.confidence === 'Medium' ? 'text-amber-400' : 'text-slate-400'}`}>
                        {currentDisplay.confidence}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {result?.testing_protocol && (
            <details className="card animate-slide-up">
              <summary className="text-xs font-semibold text-white cursor-pointer">📋 Testing Protocol</summary>
              <div className="mt-3 space-y-2">
                {result.testing_protocol.pre_test_checklist?.map((item, i) => (
                  <p key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-emerald-500 flex-shrink-0">✓</span>{item}
                  </p>
                ))}
              </div>
            </details>
          )}

          {result && <JsonViewer data={result} />}
        </div>
      </div>
    </ToolLayout>
  );
}
