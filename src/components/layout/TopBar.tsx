import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, ChevronRight, User, LogOut, Settings, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {
  '': 'Dashboard',
  clients: 'Clients',
  campaigns: 'Campaigns',
  integrations: 'Integrations',
  insights: 'Insights',
  alerts: 'Alerts',
  tasks: 'Tasks',
  reports: 'Reports',
  settings: 'Settings',
}

function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return <span className="text-sm font-medium text-slate-900">Dashboard</span>
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link to="/" className="text-slate-400 hover:text-slate-700 transition-colors">Home</Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/')
        const label = PATH_LABELS[seg] ?? seg
        const isLast = i === segments.length - 1
        const isId = seg.length > 20

        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            {isLast ? (
              <span className="font-medium text-slate-900">
                {isId ? 'Detail' : label}
              </span>
            ) : (
              <Link to={path} className="text-slate-400 hover:text-slate-700 transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const { user, signOut } = useAuth()
  const { organization } = useOrg()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
          {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-medium text-slate-900 leading-none">{user?.full_name ?? 'User'}</div>
          <div className="text-[10px] text-slate-400 capitalize mt-0.5">{user?.role}</div>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
          {/* Account info */}
          <div className="px-3 py-2.5 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-900 truncate">{user?.email}</p>
            {organization && (
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{organization.name}</p>
            )}
          </div>

          <div className="py-1">
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Settings
            </Link>
          </div>

          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => { setOpen(false); signOut() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notification bell ────────────────────────────────────────────────────────

function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
      <Bell className="w-4 h-4 text-slate-500" />
      {count > 0 && (
        <span className={cn(
          'absolute top-1 right-1 flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none',
          count > 9 ? 'text-[8px] w-4 h-4 -top-0.5 -right-0.5' : 'text-[9px] w-3.5 h-3.5'
        )}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  alertCount?: number
  actions?: React.ReactNode
}

export function TopBar({ alertCount = 0, actions }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-slate-200 bg-white flex-shrink-0">
      <Breadcrumb />

      <div className="flex items-center gap-1">
        {actions}
        <NotificationBell count={alertCount} />
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <UserMenu />
      </div>
    </header>
  )
}
