import { create } from 'zustand';

/**
 * Auth session. The access token lives in memory only (never localStorage) —
 * the httpOnly refresh cookie restores the session on reload via /auth/refresh.
 */
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  status: 'idle', // idle | loading | authenticated | anonymous
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null, accessToken: null, status: 'anonymous' }),
  setStatus: (status) => set({ status }),
}));

export const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', analyst: 'Analyst', viewer: 'Viewer' };

/** Mirrors the backend ROLE_GROUPS — used only to hide UI, never to authorise. */
export const can = {
  export: (role) => ['super_admin', 'admin', 'analyst'].includes(role),
  edit: (role) => ['super_admin', 'admin'].includes(role),
  manageTeam: (role) => role === 'super_admin',
};
