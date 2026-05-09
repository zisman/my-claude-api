'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tools = [
  { href: '/tools/landing-page',  label: 'Landing Page',     icon: '🔍', badge: 'Analyze' },
  { href: '/tools/ad-copy',       label: 'Ad Copy',          icon: '📣', badge: 'Generate' },
  { href: '/tools/seo',           label: 'SEO Optimizer',    icon: '🎯', badge: 'Optimize' },
  { href: '/tools/email',         label: 'Email Campaigns',  icon: '✉️',  badge: 'Sequence' },
  { href: '/tools/social',        label: 'Social Calendar',  icon: '📅', badge: '30 days' },
  { href: '/tools/competitors',   label: 'Competitors',      icon: '🥊', badge: 'Intel' },
  { href: '/tools/strategy',      label: 'GTM Strategy',     icon: '🚀', badge: 'Strategy' },
  { href: '/tools/ab-test',       label: 'A/B Tests',        icon: '⚗️',  badge: 'CRO' },
  { href: '/tools/persona',       label: 'Buyer Personas',   icon: '👤', badge: 'ICP' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/40">
            <span className="text-sm">✦</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Marketing AI</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Suite</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-3">Tools</p>
        {tools.map(({ href, label, icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${active
                  ? 'bg-brand-600/20 text-white border border-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-surface-hover'
                }
              `}
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="flex-1 truncate">{label}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                ${active ? 'bg-brand-500/30 text-brand-300' : 'bg-surface-border text-slate-500 group-hover:text-slate-400'}`}>
                {badge}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-surface-border">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
          <span>Claude Opus 4.7 · Adaptive</span>
        </div>
      </div>
    </aside>
  );
}
