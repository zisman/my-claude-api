import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { clsx } from 'clsx';

const nav = [
  { to: '/', label: 'Dashboard', icon: '🏠', roles: ['admin', 'instructor', 'member'] },
  { to: '/equipment', label: 'Equipment', icon: '🪂', roles: ['admin', 'instructor', 'member'] },
  { to: '/finance', label: 'Finance', icon: '💰', roles: ['admin', 'instructor'] },
  { to: '/students', label: 'Students', icon: '👥', roles: ['admin', 'instructor'] },
  { to: '/courses', label: 'Courses', icon: '🎓', roles: ['admin', 'instructor', 'member'] },
  { to: '/flights', label: 'Flights', icon: '✈️', roles: ['admin', 'instructor'] },
  { to: '/marketing', label: 'Marketing', icon: '📢', roles: ['admin', 'instructor'] },
  { to: '/social', label: 'Social Media', icon: '📱', roles: ['admin', 'instructor'] },
  { to: '/weather', label: 'Weather', icon: '🌤️', roles: ['admin', 'instructor', 'member'] },
];

export default function Sidebar({ open, onClose }) {
  const { user, club, logout } = useAuth();

  const items = nav.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-brand-900 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-700">
          <span className="text-3xl">🪂</span>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{club?.name || 'SkyManage'}</div>
            <div className="text-xs text-brand-300">Club Management</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-brand-600 text-white' : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-brand-700 pt-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-800 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-brand-300 capitalize">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
          >
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
