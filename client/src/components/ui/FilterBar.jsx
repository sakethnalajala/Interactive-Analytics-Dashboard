import { useEffect, useState } from 'react';
import { Download, FilterX } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchInput } from './DataTable';
import { Button, Chip, Select } from './index';
import { fmt } from '@/utils/format';
import { downloadCsv } from '@/lib/api';
import { toast } from '@/stores/uiStore';
import { useAuthStore, can } from '@/stores/authStore';

/**
 * Filter bar for data pages: debounced search, select filters, active chips,
 * clear all, export (role-gated) and an optional trailing action slot.
 */
export function FilterBar({ params, selects = [], searchPlaceholder, exportUrl, exportParams, children }) {
  const [q, setQ] = useState(params.search || '');
  const debounced = useDebounce(q);
  const role = useAuthStore((s) => s.user?.role);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (debounced !== (params.search || '')) params.update({ search: debounced });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!params.search && q) setQ('');
  }, [params.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const onExport = async () => {
    setExporting(true);
    try {
      const name = await downloadCsv(exportUrl, exportParams);
      toast.success(`Downloaded ${name}`);
    } catch (e) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card mb-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder={searchPlaceholder} className="w-full lg:max-w-xs" />
        <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {selects.map((s) => (
            <Select key={s.key} value={params[s.key] || ''} onChange={(e) => params.update({ [s.key]: e.target.value })} aria-label={s.label} className="sm:w-44">
              <option value="">{s.label}: All</option>
              {s.options.map((o) => (
                <option key={o.value ?? o} value={o.value ?? o}>
                  {o.label ?? fmt.label(o)}
                </option>
              ))}
            </Select>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          {exportUrl && can.export(role) && (
            <Button variant="secondary" icon={Download} loading={exporting} onClick={onExport}>
              Export CSV
            </Button>
          )}
          {children}
        </div>
      </div>
      {params.activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {params.activeFilters.map((k) => (
            <Chip key={k} onRemove={() => params.update({ [k]: '' })}>
              {fmt.label(k)}: {k === 'search' ? `“${params[k]}”` : fmt.label(params[k])}
            </Chip>
          ))}
          <button onClick={params.reset} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-danger focus-ring rounded">
            <FilterX className="h-3.5 w-3.5" /> Clear all
          </button>
        </div>
      )}
    </div>
  );
}
