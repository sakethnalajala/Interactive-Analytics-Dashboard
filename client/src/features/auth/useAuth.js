import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { post, refreshAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

/**
 * On app load, restore the session from the httpOnly refresh cookie.
 * Uses the shared in-flight refresh promise so StrictMode double-effects or
 * several guards mounting at once never send two rotations with the same token.
 */
export function useBootstrapSession() {
  const status = useAuthStore((s) => s.status);
  useEffect(() => {
    if (useAuthStore.getState().status !== 'idle') return;
    useAuthStore.getState().setStatus('loading');
    refreshAccessToken()
      .then(() => applyUserTheme(useAuthStore.getState().user))
      .catch(() => useAuthStore.getState().clearSession());
  }, [status]);
  return status;
}

function applyUserTheme(user) {
  const pref = user?.preferences?.theme;
  // Only override when the user has not chosen a theme on this device yet
  let local = null;
  try {
    local = localStorage.getItem('nova-theme');
  } catch {
    /* ignore */
  }
  if (pref && !local) useThemeStore.getState().setTheme(pref);
}

export async function login(credentials) {
  const data = await post('/auth/login', credentials);
  useAuthStore.getState().setSession(data.user, data.accessToken);
  applyUserTheme(data.user);
  return data.user;
}

export function useLogout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    try {
      await post('/auth/logout');
    } catch {
      /* cookie may already be gone */
    }
    useAuthStore.getState().clearSession();
    qc.clear();
    navigate('/login', { replace: true });
  };
}
