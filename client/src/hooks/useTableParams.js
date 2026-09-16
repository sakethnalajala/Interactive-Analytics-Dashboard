import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Table state (page, limit, sort, order, search, filters) synced to the URL.
 * Changing any filter/search/sort resets the page to 1.
 */
export function useTableParams(defaults = {}) {
  const [params, setParams] = useSearchParams();
  const base = { page: 1, limit: 10, sort: 'createdAt', order: 'desc', search: '', ...defaults };

  const state = useMemo(() => {
    const out = { ...base };
    for (const key of Object.keys(base)) {
      const v = params.get(key);
      if (v !== null) out[key] = typeof base[key] === 'number' ? Number(v) || base[key] : v;
    }
    return out;
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          const resets = Object.keys(patch).some((k) => k !== 'page' && k !== 'limit');
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === '' || v === base[k]) p.delete(k);
            else p.set(k, String(v));
          }
          if (resets) p.delete('page');
          return p;
        },
        { replace: true },
      );
    },
    [setParams], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const toggleSort = useCallback(
    (key) => update({ sort: key, order: state.sort === key && state.order === 'desc' ? 'asc' : 'desc' }),
    [state.sort, state.order, update],
  );

  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const k of Object.keys(base)) p.delete(k);
        return p;
      },
      { replace: true },
    );
  }, [setParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilters = Object.keys(base).filter((k) => !['page', 'limit', 'sort', 'order'].includes(k) && state[k] !== base[k]);

  return { ...state, update, toggleSort, reset, activeFilters };
}
