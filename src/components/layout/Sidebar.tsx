import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Megaphone, Plug, Bell, CheckSquare,
  FileText, Settings, Zap, ChevronRight, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/supabase/auth'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Clients', icon: Users, path: '/clients' },
  { label: 'Campaigns', icon: Megaphone, path: '/campaigns' },
  { label: 'Integrations', icon: Plug, path: '/integrations' },
  { label: 'Alerts', icon: Bell, path: '/alerts' },
  { label: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Reports', icon: FileText, path: '/reports' },
] as const

const BOTTOM_ITEMS = [
  { label: 'Settings', icon: Settings, path: '/settings' },
] as const

export function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <aside className="flex flex-col w-60 h-screen bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-none">AdPilot</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Campaign Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
        {NAV_ITEMS.map(item => {
          const active = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group',
                active
                  ? 'bg-[hsl(var(--sidebar-accent))] text-white'
                  : 'text-slate-400 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-[hsl(var(--sidebar-border))] pt-4">
        {BOTTOM_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              location.pathname.startsWith(item.path)
                ? 'bg-[hsl(var(--sidebar-accent))] text-white'
                : 'text-slate-400 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2 mt-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.full_name ?? 'User'}</div>
            <div className="text-[10px] text-slate-400 truncate">{user?.role}</div>
          </div>
          <button
            onClick={() => signOut()}
            className="text-slate-400 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
