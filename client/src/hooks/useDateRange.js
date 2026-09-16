import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { presetRange, isValidISO, matchPreset } from '@/utils/dates';

const KEY = 'nova-range';

function readStored() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && isValidISO(v.from) && isValidISO(v.to) && v.from <= v.to) return v;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Global date range, persisted in the URL (?from&to) so views are shareable,
 * with localStorage + the user's default preset as fallbacks.
 */
export function useDateRange() {
  const [params, setParams] = useSearchParams();
  const defaultPreset = useAuthStore((s) => s.user?.preferences?.defaultDateRange) || '30d';

  const range = useMemo(() => {
    const from = params.get('from');
    const to = params.get('to');
    if (isValidISO(from) && isValidISO(to) && from <= to) return { from, to };
    return readStored() || presetRange(defaultPreset);
  }, [params, defaultPreset]);

  const setRange = useCallback(
    (next) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('from', next.from);
          p.set('to', next.to);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { ...range, preset: matchPreset(range.from, range.to), setRange };
}
