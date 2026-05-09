'use client';

import { useState, useRef } from 'react';
import ToolLayout from '../../../components/ToolLayout';
import { JsonViewer, ErrorAlert, LoadingSpinner } from '../../../components/ResultPanel';

const SEQUENCE_TYPES = [
  { value: 'cold_outreach', label: 'Cold Outreach', icon: '🎯' },
  { value: 'drip',          label: 'Drip / Nurture', icon: '💧' },
  { value: 'newsletter',    label: 'Newsletter',     icon: '📰' },
  { value: 'promotional',   label: 'Promotional',    icon: '🎁' },
  { value: 'winback',       label: 'Win-back',       icon: '🔄' },
];

export default function EmailCampaign() {
  const [form, setForm] = useState({
    sequenceType: 'drip', product: '', description: '', targetAudience: '',
    tone: 'conversational', goal: 'demo_booking', senderName: 'Alex',
    companyName: '', uniqueValue: '', emailCount: 5, industryContext: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(0);
  const abortRef = useRef(null);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function generate() {
    setLoading(true); setError(''); setResult(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: abortRef.current.signal,
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
            if (event.type === 'complete' && event.data) {
              setResult(event.data);
            }
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const emails = result?.emails || [];

  return (
    <ToolLayout icon="✉️" title="Email Campaign Builder" description="Complete multi-email sequences for cold outreach, drip, newsletters, promos, and win-back.">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Sequence type */}
          <div className="card">
            <label className="label mb-3">Sequence Type</label>
            <div className="grid grid-cols-2 gap-2">
              {SEQUENCE_TYPES.map(({ value, label, icon }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, sequenceType: value }))}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all text-left
                    ${form.sequenceType === value
                      ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                      : 'bg-surface border-surface-border text-slate-400 hover:text-white'}`}>
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Product / Service *</label>
              <input className="input" placeholder="e.g. Acme Analytics" value={form.product} onChange={set('product')} />
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="Key benefits and features…" value={form.description} onChange={set('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sender Name</label>
                <input className="input" value={form.senderName} onChange={set('senderName')} />
              </div>
              <div>
                <label className="label">Company</label>
                <input className="input" placeholder="Your company" value={form.companyName} onChange={set('companyName')} />
              </div>
            </div>
            <div>
              <label className="label">Target Audience</label>
              <input className="input" placeholder="e.g. Marketing directors at B2B SaaS" value={form.targetAudience} onChange={set('targetAudience')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tone</label>
                <select className="input" value={form.tone} onChange={set('tone')}>
                  {['conversational', 'professional', 'friendly', 'urgent', 'formal'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Goal</label>
                <select className="input" value={form.goal} onChange={set('goal')}>
                  {['demo_booking', 'purchase', 'trial', 'webinar', 'content_download'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Number of Emails ({form.emailCount})</label>
              <input type="range" min="2" max="10" value={form.emailCount}
                onChange={e => setForm(f => ({ ...f, emailCount: Number(e.target.value) }))}
                className="w-full accent-brand-500" />
            </div>
          </div>

          <button className="btn-primary w-full" onClick={generate} disabled={!form.product || !form.description || loading}>
            {loading ? 'Generating sequence…' : `✦ Generate ${form.emailCount}-Email Sequence`}
          </button>
          {loading && <LoadingSpinner label="Claude is writing your email sequence…" />}
          <ErrorAlert error={error} />
        </div>

        <div className="space-y-4">
          {result?.sequence_overview && (
            <div className="card animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-2">📋 Sequence Overview</h3>
              <p className="text-xs text-slate-400 mb-2">{result.sequence_overview.overall_strategy}</p>
              <div className="flex gap-3 text-xs text-slate-500 mb-3">
                <span>Duration: <span className="text-white">{result.sequence_overview.estimated_duration}</span></span>
                <span>Open rate: <span className="text-white">{result.sequence_overview.expected_open_rate}</span></span>
              </div>
              <div className="flex flex-wrap gap-1">
                {result.sequence_overview.key_copywriting_frameworks?.map(f => (
                  <span key={f} className="tag bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px]">{f}</span>
                ))}
              </div>
            </div>
          )}

          {emails.length > 0 && (
            <>
              {/* Email tabs */}
              <div className="flex flex-wrap gap-1">
                {emails.map((e, i) => (
                  <button key={i} onClick={() => setSelectedEmail(i)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all
                      ${selectedEmail === i ? 'bg-brand-600 text-white' : 'bg-surface-card text-slate-400 hover:text-white border border-surface-border'}`}>
                    #{i + 1}
                  </button>
                ))}
              </div>

              {/* Email viewer */}
              {emails[selectedEmail] && (
                <div className="card animate-fade-in space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Send</p>
                    <p className="text-xs text-white">{emails[selectedEmail].send_timing}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Subject Lines</p>
                    <p className="text-sm font-semibold text-white bg-surface p-2 rounded border border-surface-border">
                      {emails[selectedEmail].subject_lines?.primary}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      A/B: {emails[selectedEmail].subject_lines?.ab_variant}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Preview: {emails[selectedEmail].subject_lines?.preview_text}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Email Body</p>
                    <div className="result-block max-h-64 text-xs">
                      {emails[selectedEmail].body?.full_copy}
                    </div>
                    {emails[selectedEmail].body?.ps_line && (
                      <p className="text-xs text-slate-500 mt-2 italic">P.S. {emails[selectedEmail].body.ps_line}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>CTA: <span className="text-brand-400 font-medium">{emails[selectedEmail].body?.cta?.primary_cta_text}</span></span>
                    <span>{emails[selectedEmail].estimated_read_time} read</span>
                  </div>
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
