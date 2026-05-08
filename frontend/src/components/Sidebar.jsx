import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Megaphone, Users, GraduationCap, Wind,
  Package, Wrench, CloudSun, MessageCircle, Map, BookOpen,
  Bot, ChevronRight, ChevronLeft, Truck
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'לוח בקרה' },
  { to: '/marketing', icon: Megaphone, label: 'שיווק ופרסום' },
  { to: '/customers', icon: Users, label: 'לקוחות' },
  { to: '/students', icon: GraduationCap, label: 'תלמידים' },
  { to: '/flights', icon: Wind, label: 'טיסות חוויה' },
  { to: '/suppliers', icon: Truck, label: 'ספקים' },
  { to: '/equipment', icon: Package, label: 'ציוד' },
  { to: '/maintenance', icon: Wrench, label: 'תחזוקה' },
  { to: '/weather', icon: CloudSun, label: 'מזג אוויר' },
  { to: '/community', icon: MessageCircle, label: 'קהילה' },
  { to: '/routes', icon: Map, label: 'מסלולי טיסה' },
  { to: '/lessons', icon: BookOpen, label: 'שיעורים אונליין' },
  { to: '/ai', icon: Bot, label: 'עוזר AI' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white flex flex-col transition-all duration-300 min-h-screen`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <div>
            <div className="font-bold text-lg leading-tight">מועדון</div>
            <div className="font-bold text-lg leading-tight text-sky-400">מצנחי רחיפה</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-700 transition-colors"
        >
          {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-700 ${
                isActive ? 'bg-sky-600 text-white' : 'text-slate-300'
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        {!collapsed && 'v1.0.0'}
      </div>
    </aside>
  );
}
