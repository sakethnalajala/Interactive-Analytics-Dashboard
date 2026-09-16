import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from 'lucide-react';
import { cn, fmt } from '@/utils/format';
import { Skeleton, EmptyState, ErrorState } from './index';

/**
 * Server-driven table. `columns` = [{ key, label, sortable, align, width, render(row) }]
 * `sort`/`order`/`onSort` control sorting; `pagination` + `onPage`/`onLimit` control paging.
 */
export function DataTable({
  columns,
  rows = [],
  loading,
  fetching,
  error,
  onRetry,
  sort,
  order,
  onSort,
  pagination,
  onPage,
  onLimit,
  onRowClick,
  rowKey = 'id',
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting your search or filters.',
  compact,
  className,
}) {
  const showSkeleton = loading && !rows.length;
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className={cn('scroll-x transition-opacity', fetching && !loading && 'opacity-60')}>
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              {columns.map((c) => {
                const active = sort === c.key;
                const Icon = active ? (order === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    className={cn('px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}
                  >
                    {c.sortable ? (
                      <button onClick={() => onSort?.(c.key)} className={cn('inline-flex items-center gap-1 hover:text-ink focus-ring rounded', active && 'text-brand')} aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        {c.label}
                        <Icon className={cn('h-3 w-3', !active && 'opacity-40')} />
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-line/60">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : !error &&
                rows.map((row, i) => (
                  <tr
                    key={row[rowKey] ?? i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn('border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2/70', onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 text-sm text-ink', compact ? 'py-2' : 'py-3.5', c.align === 'right' && 'text-right tabular', c.align === 'center' && 'text-center', c.cellClassName)}>
                        {c.render ? c.render(row) : (row[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {error && <ErrorState error={error} onRetry={onRetry} compact />}
        {!error && !loading && rows.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} icon={Search} className="py-12" />}
      </div>
      {pagination && <Pagination {...pagination} onPage={onPage} onLimit={onLimit} />}
    </div>
  );
}

export function Pagination({ page, pages, total, limit, onPage, onLimit }) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const btn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent focus-ring';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-ink">{fmt.number(start)}–{fmt.number(end)}</span> of <span className="font-semibold text-ink">{fmt.number(total)}</span>
        </span>
        {onLimit && (
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-ink focus-ring" aria-label="Rows per page">
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(1)} aria-label="First page">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 font-semibold text-ink">
          {page} <span className="font-normal text-muted">/ {pages}</span>
        </span>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(pages)} aria-label="Last page">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Debounced search input used in every filter bar. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9 pr-8" aria-label={placeholder} />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink focus-ring" aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
