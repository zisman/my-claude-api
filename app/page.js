import Link from 'next/link';

const tools = [
  {
    href: '/tools/landing-page',
    icon: '🔍',
    title: 'Landing Page Analyzer',
    description: 'Deep 7-dimension audit of any URL. Real page fetching, grade A+→F, CRO fixes.',
    tags: ['Speed', 'Design', 'SEO', 'Conversion'],
    gradient: 'from-violet-500/20 to-purple-600/10',
    border: 'border-violet-500/20 hover:border-violet-500/40',
  },
  {
    href: '/tools/ad-copy',
    icon: '📣',
    title: 'Ad Copy Generator',
    description: 'Platform-optimized ad copy for Google, Meta, LinkedIn, TikTok, and YouTube.',
    tags: ['Google Ads', 'Meta', 'TikTok'],
    gradient: 'from-sky-500/20 to-blue-600/10',
    border: 'border-sky-500/20 hover:border-sky-500/40',
  },
  {
    href: '/tools/seo',
    icon: '🎯',
    title: 'SEO Optimizer',
    description: 'Full audit: keywords, schema markup, content gaps, meta tags, technical fixes.',
    tags: ['On-Page', 'Technical', 'Schema'],
    gradient: 'from-emerald-500/20 to-green-600/10',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
  },
  {
    href: '/tools/email',
    icon: '✉️',
    title: 'Email Campaign Builder',
    description: 'Complete sequences — cold outreach, drip, newsletters, promos, win-back.',
    tags: ['Cold Outreach', 'Drip', 'Newsletter'],
    gradient: 'from-amber-500/20 to-orange-600/10',
    border: 'border-amber-500/20 hover:border-amber-500/40',
  },
  {
    href: '/tools/social',
    icon: '📅',
    title: '30-Day Social Calendar',
    description: 'Full month of platform-specific posts with captions, hooks, and hashtags.',
    tags: ['Instagram', 'LinkedIn', 'TikTok'],
    gradient: 'from-pink-500/20 to-rose-600/10',
    border: 'border-pink-500/20 hover:border-pink-500/40',
  },
  {
    href: '/tools/competitors',
    icon: '🥊',
    title: 'Competitor Intelligence',
    description: 'Real web-fetched competitor analysis with battle cards and gap analysis.',
    tags: ['Battle Cards', 'Positioning', 'Gaps'],
    gradient: 'from-red-500/20 to-rose-700/10',
    border: 'border-red-500/20 hover:border-red-500/40',
  },
  {
    href: '/tools/strategy',
    icon: '🚀',
    title: 'GTM Strategy',
    description: 'Investor-grade go-to-market plan with channels, funnel, budget, and 90-day roadmap.',
    tags: ['Positioning', 'Channels', 'KPIs'],
    gradient: 'from-indigo-500/20 to-brand-700/10',
    border: 'border-indigo-500/20 hover:border-indigo-500/40',
  },
  {
    href: '/tools/ab-test',
    icon: '⚗️',
    title: 'A/B Test Variants',
    description: 'Psychology-grounded CRO variants with sample size math and testing protocol.',
    tags: ['CRO', 'Conversion', 'Psychology'],
    gradient: 'from-cyan-500/20 to-teal-600/10',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
  },
  {
    href: '/tools/persona',
    icon: '👤',
    title: 'Buyer Persona Builder',
    description: 'Jobs-to-be-Done personas with messaging guides and GTM implications.',
    tags: ['ICP', 'JTBD', 'Messaging'],
    gradient: 'from-fuchsia-500/20 to-purple-700/10',
    border: 'border-fuchsia-500/20 hover:border-fuchsia-500/40',
  },
];

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 bg-brand-600/10 border border-brand-500/20 rounded-full px-3 py-1 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
          Powered by Claude Opus 4.7
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Marketing AI Suite
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl">
          Professional-grade AI marketing tools for agencies and growth teams.
          Every tool uses adaptive thinking and prompt caching for deep, accurate results.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { value: '9', label: 'AI Tools' },
          { value: 'Opus 4.7', label: 'Model' },
          { value: '~10%', label: 'Cached Cost' },
          { value: '∞', label: 'Use Cases' },
        ].map(({ value, label }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-3 gap-4">
        {tools.map(({ href, icon, title, description, tags, gradient, border }) => (
          <Link
            key={href}
            href={href}
            className={`
              card group cursor-pointer transition-all duration-200 hover:scale-[1.02]
              bg-gradient-to-br ${gradient} border ${border} animate-slide-up
            `}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl leading-none">{icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm group-hover:text-brand-300 transition-colors">
                  {title}
                </h3>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">{description}</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span key={t} className="tag bg-white/5 text-slate-400 border border-white/10 text-[10px]">{t}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
