'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/students', label: 'Students', icon: '👥' },
  { href: '/courses', label: 'Courses', icon: '🎓' },
  { href: '/equipment', label: 'Equipment', icon: '🪂' },
  { href: '/service', label: 'Service Orders', icon: '🔧' },
  { href: '/weather', label: 'Weather', icon: '🌤️' },
  { href: '/leads', label: 'Leads', icon: '📋' },
  { href: '/marketing', label: 'Marketing', icon: '📢' },
];

export function Sidebar({ user, club }: { user: any; club: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-brand-900 text-white h-screen sticky top-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-800">
        <span className="text-3xl">🪂</span>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{club?.name || 'SkyClub'}</div>
          <div className="text-xs text-blue-300">Club Management</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-brand-600 text-white'
                : 'text-blue-200 hover:bg-brand-800 hover:text-white'
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-brand-800 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-800 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold">
            {user?.firstName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-xs text-blue-300 capitalize">{user?.role?.toLowerCase()}</div>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-brand-800 transition-colors">
          🚪 Sign out
        </button>
      </div>
    </aside>
  );
}
