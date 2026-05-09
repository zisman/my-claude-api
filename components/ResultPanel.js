'use client';

import { useState } from 'react';

export function ScoreBar({ label, score, color = 'brand' }) {
  const colors = {
    brand:   'bg-brand-500',
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
    red:     'bg-red-500',
    sky:     'bg-sky-500',
  };
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">{score}/100</span>
      </div>
      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[color] || colors.brand}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function GradeBadge({ grade }) {
  const cls = !grade ? '' :
    grade.startsWith('A') ? 'grade-a' :
    grade.startsWith('B') ? 'grade-b' :
    grade.startsWith('C') ? 'grade-c' :
    grade.startsWith('D') ? 'grade-d' : 'grade-f';
  return (
    <span className={`inline-block text-3xl font-black px-3 py-1 rounded-lg border ${cls}`}>
      {grade}
    </span>
  );
}

export function JsonViewer({ data }) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="mt-4">
      <button onClick={() => setExpanded(!expanded)} className="btn-ghost text-xs mb-2">
        {expanded ? '▲ Hide' : '▼ Show'} raw JSON
      </button>
      {expanded && (
        <pre className="result-block animate-fade-in">{json}</pre>
      )}
    </div>
  );
}

export function StreamingOutput({ text, isStreaming }) {
  if (!text && !isStreaming) return null;
  return (
    <div className={`result-block mt-4 ${isStreaming ? 'streaming-cursor' : ''}`}>
      {text || ''}
    </div>
  );
}

export function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
      <span className="font-semibold">Error: </span>{error}
    </div>
  );
}

export function LoadingSpinner({ label = 'Generating...' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-400 mt-4">
      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function IssuesList({ items, color = 'red' }) {
  if (!items?.length) return null;
  const dotColor = color === 'red' ? 'bg-red-500' : color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1 flex-shrink-0`} />
          {item}
        </li>
      ))}
    </ul>
  );
}
