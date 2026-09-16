import { create } from 'zustand';

let toastId = 0;

export const useUiStore = create((set, get) => ({
  sidebarCollapsed: (() => {
    try {
      return localStorage.getItem('nova-sidebar') === 'collapsed';
    } catch {
      return false;
    }
  })(),
  mobileNavOpen: false,
  toasts: [],

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      localStorage.setItem('nova-sidebar', next ? 'collapsed' : 'open');
    } catch {
      /* ignore */
    }
    set({ sidebarCollapsed: next });
  },
  setMobileNav: (open) => set({ mobileNavOpen: open }),

  toast: (message, { type = 'success', duration = 3500 } = {}) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismissToast(id), duration);
    return id;
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (m) => useUiStore.getState().toast(m, { type: 'success' }),
  error: (m) => useUiStore.getState().toast(m, { type: 'error', duration: 5000 }),
  info: (m) => useUiStore.getState().toast(m, { type: 'info' }),
};
