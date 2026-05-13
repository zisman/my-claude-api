import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Megaphone, Plug, Bell, CheckSquare,
  FileText, Settings, Zap, ChevronRight, LogOut, ChevronLeft,
  Building2, Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
  minimumRole?: UserRole
  badge?: number
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Clients', icon: Users, path: '/clients', minimumRole: 'analyst' },
  { label: 'Campaigns', icon: Megaphone, path: '/campaigns' },
  { label: 'Insights', icon: Brain, path: '/insights' },
  { label: 'Alerts', icon: Bell, path: '/alerts' },
  { label: 'Tasks', icon: CheckSquare, path: '/tasks' },
]

const MANAGE_NAV: NavItem[] = [
  { label: 'Reports', icon: FileText, path: '/reports' },
  { label: 'Integrations', icon: Plug, path: '/integrations', minimumRole: 'manager' },
]

const BOTTOM_NAV: NavItem[] = [
  { label: 'Settings', icon: Settings, path: '/settings' },
]

interface NavLinkProps {
  item: NavItem
  collapsed: boolean
  active: boolean
}

function NavLink({ item, collapsed, active }: NavLinkProps) {
  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative',
        collapsed ? 'justify-center' : '',
        active
          ? 'bg-[hsl(var(--sidebar-accent))] text-white'
          : 'text-slate-400 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {active && <ChevronRight className="w-3 h-3 opacity-50" />}
        </>
      )}
      {collapsed && active && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-400 rounded-full" />
      )}
    </Link>
  )
}

function NavSection({
  label,
  items,
  collapsed,
  canAccess,
  location,
}: {
  label: string
  items: NavItem[]
  collapsed: boolean
  canAccess: (role: UserRole) => boolean
  location: ReturnType<typeof useLocation>
}) {
  const visible = items.filter(i => !i.minimumRole || canAccess(i.minimumRole))
  if (!visible.length) return null

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
      )}
      {visible.map(item => {
        const active = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path)
        return <NavLink key={item.path} item={item} collapsed={collapsed} active={active} />
      })}
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()
  const { user, canAccess, signOut } = useAuth()
  const { organization } = useOrg()
  const [collapsed, setCollapsed] = useState(false)

  const w = collapsed ? 'w-[60px]' : 'w-60'

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] flex-shrink-0 transition-all duration-200',
        w
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn(
        'flex items-center border-b border-[hsl(var(--sidebar-border))] flex-shrink-0',
        collapsed ? 'justify-center px-0 py-4' : 'px-4 py-4 gap-2.5'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white leading-none">AdPilot</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Campaign Intelligence</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
            <Zap className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0',
            collapsed ? 'hidden' : ''
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Org badge */}
      {!collapsed && organization && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--sidebar-border))]">
          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-300 truncate">{organization.name}</div>
            <div className="text-[10px] text-slate-500 capitalize">{organization.plan} plan</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto scrollbar-none">
        <NavSection
          label="Overview"
          items={MAIN_NAV}
          collapsed={collapsed}
          canAccess={canAccess}
          location={location}
        />
        <NavSection
          label="Manage"
          items={MANAGE_NAV}
          collapsed={collapsed}
          canAccess={canAccess}
          location={location}
        />
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-[hsl(var(--sidebar-border))] pt-3">
        {BOTTOM_NAV.map(item => {
          const active = location.pathname.startsWith(item.path)
          return <NavLink key={item.path} item={item} collapsed={collapsed} active={active} />
        })}

        {/* User row */}
        <div className={cn(
          'flex items-center gap-2.5 px-2 py-2 mt-1',
          collapsed ? 'justify-center' : ''
        )}>
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.full_name ?? 'User'}</div>
              <div className="text-[10px] text-slate-400 capitalize truncate">{user?.role}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex justify-center py-1 text-slate-500 hover:text-slate-300 transition-colors"
            title="Expand"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  )
}
