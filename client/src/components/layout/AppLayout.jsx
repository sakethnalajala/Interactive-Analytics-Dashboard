import { Suspense } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, Moon, Sun, Monitor, LogOut, UserCircle, Settings, Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/format';
import { useUiStore } from '@/stores/uiStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore, ROLE_LABELS } from '@/stores/authStore';
import { useLogout } from '@/features/auth/useAuth';
import { Sidebar, NAV } from './Sidebar';
import { DateRangePicker } from './DateRangePicker';
import { Avatar, Skeleton, Badge } from '@/components/ui';
import { Dropdown, DropdownItem } from '@/components/ui/Overlay';

const PAGES_WITH_RANGE = ['/overview', '/analytics', '/revenue', '/customers', '/products', '/orders', '/reports'];

export function ThemeToggle({ className }) {
  const { theme, resolved, setTheme } = useThemeStore();
  const Icon = theme === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;
  return (
    <Dropdown
      trigger={
        <button className={cn('flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:border-brand/40 hover:text-brand focus-ring', className)} aria-label="Change theme" title="Theme">
          <Icon className="h-[18px] w-[18px]" />
        </button>
      }
    >
      {[
        ['light', 'Light', Sun],
        ['dark', 'Dark', Moon],
        ['system', 'System', Monitor],
      ].map(([v, label, I]) => (
        <DropdownItem key={v} icon={I} onClick={() => setTheme(v)} aria-pressed={theme === v}>
          <span className="flex-1">{label}</span>
          {theme === v && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

function Header() {
  const setMobile = useUiStore((s) => s.setMobileNav);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { pathname } = useLocation();
  const current = NAV.flatMap((g) => g.items).find((i) => pathname.startsWith(i.to));
  const showRange = PAGES_WITH_RANGE.some((p) => pathname.startsWith(p));

  return (
    <header className={cn('glass sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b px-4 sm:px-6 lg:px-8')}>
      <button onClick={() => setMobile(true)} className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-ink focus-ring lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted sm:block">
          {NAV.find((g) => g.items.includes(current))?.group || 'Nova'} <span className="mx-1 opacity-50">/</span> {current?.label}
        </p>
        <h2 className="truncate text-lg font-extrabold text-ink sm:text-xl">{current?.label || 'Dashboard'}</h2>
      </div>
      <div className="flex items-center gap-2">
        {showRange && <DateRangePicker />}
        <ThemeToggle className="hidden sm:flex" />
        <Dropdown
          trigger={
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:border-brand/40 hover:text-brand focus-ring" aria-label="Notifications">
              <span className="relative">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
              </span>
            </button>
          }
          className="w-72"
        >
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">Notifications</p>
          <Link to="/products?status=low_stock" className="block rounded-lg px-3 py-2 hover:bg-surface-2">
            <p className="text-sm font-semibold text-ink">Low-stock products need attention</p>
            <p className="text-xs text-muted">Review inventory in Products</p>
          </Link>
          <Link to="/orders?status=pending" className="block rounded-lg px-3 py-2 hover:bg-surface-2">
            <p className="text-sm font-semibold text-ink">Pending orders awaiting processing</p>
            <p className="text-xs text-muted">Open the Orders queue</p>
          </Link>
        </Dropdown>
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1 pr-2 hover:border-brand/40 focus-ring" aria-label="Account menu">
              <Avatar name={user?.name} color={user?.avatarColor} size="sm" />
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-ink md:block">{user?.name?.split(' ')[0]}</span>
            </button>
          }
          className="w-60"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
            <Badge status={user?.role} dot={false} className="mt-1.5">
              {ROLE_LABELS[user?.role]}
            </Badge>
          </div>
          <div className="my-1 border-t border-line" />
          <Link to="/profile">
            <DropdownItem icon={UserCircle}>Profile</DropdownItem>
          </Link>
          <Link to="/settings">
            <DropdownItem icon={Settings}>Settings</DropdownItem>
          </Link>
          <div className="sm:hidden">
            <DropdownItem icon={useThemeStore.getState().resolved === 'dark' ? Sun : Moon} onClick={() => useThemeStore.getState().toggle()}>
              Toggle theme
            </DropdownItem>
          </div>
          <div className="my-1 border-t border-line" />
          <DropdownItem icon={LogOut} danger onClick={logout}>
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
      <span className="hidden" data-collapsed={collapsed} />
    </header>
  );
}

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tones = { success: 'text-success', error: 'text-danger', info: 'text-info' };
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const I = icons[t.type];
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop animate-slide-in-right">
            <I className={cn('mt-0.5 h-5 w-5 shrink-0', tones[t.type])} />
            <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-muted hover:text-ink focus-ring" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl2" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl2" />
    </div>
  );
}

export function AppLayout() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]')}>
        <Header />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={pathname} className="mx-auto max-w-[1600px] animate-fade-up">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <footer className="px-4 py-4 text-center text-xs text-muted sm:px-6 lg:px-8">© {new Date().getFullYear()} Nova Analytics · Built with React, Express & MongoDB</footer>
      </div>
      <Toaster />
    </div>
  );
}
