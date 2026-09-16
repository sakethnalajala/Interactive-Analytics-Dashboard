import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useBootstrapSession } from './useAuth';
import { Logo } from '@/components/layout/Sidebar';

function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Logo />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-1/2 animate-shimmer rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}

/** Requires an authenticated session. Restores it from the refresh cookie first. */
export function ProtectedRoute() {
  const status = useBootstrapSession();
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Redirects signed-in users away from public pages like /login. */
export function PublicOnlyRoute() {
  const status = useBootstrapSession();
  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (status === 'authenticated') return <Navigate to="/overview" replace />;
  return <Outlet />;
}

/** UI-level role gate (the API enforces the real rule). */
export function RoleRoute({ roles }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!roles.includes(role)) return <Navigate to="/overview" replace />;
  return <Outlet />;
}
