import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3, DollarSign, Users, Package, ShoppingCart, FileText, Settings, UserCircle, ChevronsLeft, X, LogOut } from 'lucide-react';
import { cn } from '@/utils/format';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore, ROLE_LABELS } from '@/stores/authStore';
import { useLogout } from '@/features/auth/useAuth';
import { Avatar, Badge } from '@/components/ui';

export const NAV = [
  {
    group: 'Dashboards',
    items: [
      { to: '/overview', label: 'Overview', icon: LayoutDashboard },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/revenue', label: 'Sales & Revenue', icon: DollarSign },
    ],
  },
  {
    group: 'Data',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/products', label: 'Products', icon: Package },
      { to: '/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ],
  },
];

export function Logo({ collapsed }) {
  return (
    <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-[#39B8FF] text-white shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17l5-7 4 4 7-9" />
          <circle cx="20" cy="5" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {!collapsed && (
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Nova<span className="text-brand">Analytics</span>
        </span>
      )}
    </div>
  );
}

function NavItems({ collapsed, onNavigate }) {
  const { search } = useLocation();
  // Keep the global date range when moving between pages
  const params = new URLSearchParams(search);
  const keep = new URLSearchParams();
  for (const k of ['from', 'to']) if (params.get(k)) keep.set(k, params.get(k));
  const qs = keep.toString() ? `?${keep}` : '';

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Main">
      {NAV.map((g) => (
        <div key={g.group}>
          {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted/80">{g.group}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to + qs}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 focus-ring',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
                      <item.icon className={cn('h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110', isActive && 'text-brand')} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ collapsed }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  if (!user) return null;
  return (
    <div className={cn('border-t border-line p-3', collapsed && 'flex justify-center')}>
      {collapsed ? (
        <button onClick={logout} title="Sign out" className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-danger focus-ring">
          <LogOut className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-surface-2/70 p-2.5">
          <Avatar name={user.name} color={user.avatarColor} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <Badge status={user.role} dot={false} className="mt-0.5 px-2 py-0.5">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
          <button onClick={logout} title="Sign out" className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger focus-ring" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobile = useUiStore((s) => s.setMobileNav);

  return (
    <>
      {/* Desktop */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex', collapsed ? 'w-[76px]' : 'w-[260px]')}>
        <div className={cn('flex h-[72px] items-center px-5', collapsed && 'justify-center px-0')}>
          <Logo collapsed={collapsed} />
        </div>
        <NavItems collapsed={collapsed} />
        <button onClick={toggle} className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink focus-ring" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && 'Collapse'}
        </button>
        <UserCard collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0b1437]/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobile(false)} />
          <aside className="glass relative flex h-full w-[280px] flex-col border-r shadow-pop animate-slide-in-left">
            <div className="flex h-[72px] items-center justify-between px-5">
              <Logo />
              <button onClick={() => setMobile(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 focus-ring" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setMobile(false)} />
            <UserCard />
          </aside>
        </div>
      )}
    </>
  );
}
