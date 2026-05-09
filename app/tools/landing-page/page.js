'use client';

import { useState } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { ScoreBar, GradeBadge, JsonViewer, ErrorAlert, LoadingSpinner, IssuesList } from '../../../components/ResultPanel';

const DIMENSIONS = ['speed', 'design', 'content', 'conversion', 'seo', 'trust_signals', 'mobile'];
const DIM_LABELS = { speed: 'Speed', design: 'Design', content: 'Content', conversion: 'Conversion', seo: 'SEO', trust_signals: 'Trust', mobile: 'Mobile' };
const DIM_ICONS  = { speed: '⚡', design: '🎨', content: '✍️', conversion: '💰', seo: '🎯', trust_signals: '🛡️', mobile: '📱' };

export default function LandingPageAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function analyze() {
    if (!url) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/analyze-landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url }),
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
    <ToolLayout icon="🔍" title="Landing Page Analyzer" description="Deep AI audit of any landing page — real web fetching, 7-dimension scoring, CRO recommendations.">
      {/* Input */}
      <div className="card mb-6">
        <label className="label">Page URL</label>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="https://your-landing-page.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
          />
          <button className="btn-primary" onClick={analyze} disabled={!url || loading}>
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner label="Claude is fetching and analyzing the page…" />}
      <ErrorAlert error={error} />

      {result && (
        <div className="animate-slide-up space-y-5">
          {/* Overview */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{result.page_name}</h2>
                <p className="text-sm text-slate-500">{result.website_category} · {result.target_audience}</p>
              </div>
              <div className="text-right">
                <GradeBadge grade={result.grade} />
                <p className="text-xs text-slate-500 mt-1">Score: {result.overall_score}/100</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm">
                <span className="text-slate-500">Est. conversion rate: </span>
                <span className="text-white font-medium">{result.estimated_conversion_rate}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Benchmark: </span>
                <span className="text-white font-medium">{result.conversion_rate_benchmark}</span>
              </div>
            </div>
          </div>

          {/* Scores grid */}
          <div className="grid grid-cols-2 gap-4">
            {DIMENSIONS.map(dim => {
              const d = result.analysis?.[dim];
              if (!d) return null;
              const score = d.score;
              const barColor = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';
              return (
                <div key={dim} className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{DIM_ICONS[dim]}</span>
                    <span className="text-sm font-semibold text-white">{DIM_LABELS[dim]}</span>
                  </div>
                  <ScoreBar label="" score={score} color={barColor} />
                  <p className="text-xs text-slate-400 mt-1 mb-2">{d.headline}</p>
                  {d.issues?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
                        {d.issues.length} issues / {d.fixes?.length || 0} fixes
                      </summary>
                      <div className="mt-2 space-y-2">
                        <IssuesList items={d.issues} color="red" />
                        <IssuesList items={d.fixes} color="emerald" />
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          {/* Top 3 priorities */}
          {result.top_3_priorities?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-3">🏆 Top 3 Priorities</h3>
              <ol className="space-y-2">
                {result.top_3_priorities.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-slate-300">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Quick wins */}
          {result.quick_wins?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-3">⚡ Quick Wins</h3>
              <div className="space-y-3">
                {result.quick_wins.map((w, i) => (
                  <div key={i} className="border-l-2 border-brand-500/40 pl-3">
                    <p className="text-sm text-white font-medium">{w.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{w.why}</p>
                    <p className="text-xs text-brand-400 mt-0.5">{w.how}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A/B Test Ideas */}
          {result.ab_test_ideas?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-3">⚗️ A/B Test Ideas</h3>
              <div className="space-y-3">
                {result.ab_test_ideas.map((t, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface border border-surface-border">
                    <p className="text-xs font-semibold text-slate-300 mb-1">Test: {t.element}</p>
                    <p className="text-xs text-slate-500 mb-2">{t.hypothesis}</p>
                    <div className="flex gap-2">
                      {t.variants?.map((v, j) => (
                        <span key={j} className="tag bg-surface-hover border border-surface-border text-slate-400 text-[10px]">
                          {j === 0 ? 'A: ' : 'B: '}{v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <JsonViewer data={result} />
        </div>
      )}
    </ToolLayout>
  );
}
