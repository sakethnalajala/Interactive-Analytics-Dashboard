import { create } from 'zustand';

const KEY = 'nova-theme';
const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readSaved() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

function resolve(theme) {
  return theme === 'system' ? (media?.matches ? 'dark' : 'light') : theme;
}

function apply(theme) {
  const resolved = resolve(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export const useThemeStore = create((set, get) => ({
  theme: readSaved(), // 'light' | 'dark' | 'system'
  resolved: apply(readSaved()),
  setTheme: (theme) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode */
    }
    set({ theme, resolved: apply(theme) });
  },
  toggle: () => get().setTheme(get().resolved === 'dark' ? 'light' : 'dark'),
}));

// Follow OS changes while in "system" mode
media?.addEventListener('change', () => {
  const { theme } = useThemeStore.getState();
  if (theme === 'system') useThemeStore.setState({ resolved: apply('system') });
});
