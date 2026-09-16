import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FileText, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useDateRange } from '@/hooks/useDateRange';
import { useReportTypes, useReport, useProductFilters, useCustomerFilters, useOrderFilters } from '@/api/queries';
import { ChartCard, TrendChart, BarsChart } from '@/components/charts';
import { PageHeader, Card, Button, Select, Badge, Skeleton, ErrorState, EmptyState, Segmented } from '@/components/ui';
import { Pagination } from '@/components/ui/DataTable';
import { downloadCsv } from '@/lib/api';
import { toast } from '@/stores/uiStore';
import { useAuthStore, can } from '@/stores/authStore';
import { fmt, formatBy, cn } from '@/utils/format';
import { rangeLabel } from '@/utils/dates';

const FILTER_KEYS = ['category', 'status', 'segment', 'country'];
const STORAGE = 'nova-report-filters';

export default function ReportsPage() {
  const range = useDateRange();
  const role = useAuthStore((s) => s.user?.role);
  const [params, setParams] = useSearchParams();
  const types = useReportTypes();
  const productFilters = useProductFilters();
  const customerFilters = useCustomerFilters();
  const orderFilters = useOrderFilters();

  // Report type + filters persist in the URL, with localStorage as a fallback between visits.
  const stored = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || '{}');
    } catch {
      return {};
    }
  }, []);
  const type = params.get('type') || stored.type || 'revenue';
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? stored[k] ?? '']).filter(([, v]) => v));
  const [granularity, setGranularity] = useState(params.get('granularity') || 'auto');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ type, ...filters }));
    } catch {
      /* ignore */
    }
  }, [type, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) (v ? p.set(k, v) : p.delete(k));
        return p;
      },
      { replace: true },
    );
  const selectType = (t) => {
    const p = { type: t };
    for (const k of FILTER_KEYS) p[k] = '';
    set(p);
  };

  const query = { from: range.from, to: range.to, ...(granularity !== 'auto' && { granularity }), ...filters };
  const report = useReport(type, query);
  const meta = types.data?.types.find((t) => t.id === type);

  const [exporting, setExporting] = useState(false);
  const onExport = async () => {
    setExporting(true);
    try {
      toast.success(`Downloaded ${await downloadCsv(`/reports/${type}/export`, query)}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  const filterOptions = {
    category: (productFilters.data?.categories || []).map((c) => ({ value: c, label: c })),
    status: (orderFilters.data?.statuses || []).map((s) => ({ value: s, label: fmt.label(s) })),
    segment: (customerFilters.data?.segments || []).map((s) => ({ value: s, label: fmt.label(s) })),
    country: (customerFilters.data?.countries || []).map((c) => ({ value: c, label: c })),
  };
  const showGranularity = ['revenue', 'engagement'].includes(type);

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Build, preview and export reports · ${rangeLabel(range.from, range.to)}`}
        actions={
          can.export(role) && (
            <Button icon={Download} loading={exporting} onClick={onExport} disabled={!report.data}>
              Export CSV
            </Button>
          )
        }
      />

      {/* Report type picker */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(types.data?.types || Array.from({ length: 5 }, (_, i) => ({ id: i }))).map((t) =>
          t.label ? (
            <button
              key={t.id}
              onClick={() => selectType(t.id)}
              aria-pressed={type === t.id}
              className={cn('card p-4 text-left transition-all focus-ring hover:-translate-y-0.5', type === t.id && 'border-brand ring-2 ring-brand/30')}
            >
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', type === t.id ? 'bg-brand text-white' : 'bg-brand-soft text-brand')}>
                <FileText className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">{t.label}</p>
              <p className="mt-0.5 text-xs text-muted">{t.description}</p>
            </button>
          ) : (
            <Skeleton key={t.id} className="h-28 rounded-xl2" />
          ),
        )}
      </div>

      {/* Filters */}
      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Filters</p>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {(meta?.filters || []).map((f) => (
              <Select key={f} value={filters[f] || ''} onChange={(e) => set({ [f]: e.target.value })} aria-label={f} className="sm:w-48">
                <option value="">{fmt.label(f)}: All</option>
                {filterOptions[f].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            ))}
            {!meta?.filters?.length && <p className="self-center text-sm text-muted">This report uses the global date range only.</p>}
          </div>
          {showGranularity && (
            <Segmented value={granularity} onChange={(g) => { setGranularity(g); set({ granularity: g === 'auto' ? '' : g }); }} options={[{ value: 'auto', label: 'Auto' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
          )}
        </div>
      </Card>

      {report.isError ? (
        <Card className="mt-6"><ErrorState error={report.error} onRetry={report.refetch} /></Card>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(report.data?.summary || Array.from({ length: 4 }, (_, i) => ({ i }))).map((s, i) => (
              <div key={s.label ?? i} className="card p-5">
                {s.label ? (
                  <>
                    <p className="text-xs font-semibold text-muted">{s.label}</p>
                    <p className="mt-1 text-2xl font-extrabold tabular text-ink">{formatBy(s.format, s.value)}</p>
                  </>
                ) : (
                  <><Skeleton className="h-3 w-24" /><Skeleton className="mt-2 h-7 w-32" /></>
                )}
              </div>
            ))}
          </div>

          <ChartCard className="mt-6" title={`${meta?.label || ''} overview`} subtitle="Visual summary of the report data" loading={report.isLoading} empty={report.data && !(report.data.chart.data || report.data.rows).length} height={280}>
            {report.data && <ReportChart chart={report.data.chart} rows={report.data.rows} granularity={report.data.meta.granularity} />}
          </ChartCard>

          <ReportTable report={report.data} loading={report.isLoading} />
        </>
      )}
    </>
  );
}

function ReportChart({ chart, rows, granularity }) {
  const data = chart.data || rows;
  const format = chart.series[0].key === 'count' ? 'number' : ['revenue', 'profit'].includes(chart.series[0].key) ? 'currency' : 'number';
  if (chart.type === 'area') return <TrendChart data={data} granularity={granularity} format={format} height={280} series={chart.series.map((s, i) => ({ ...s, color: `var(--chart-${i === 0 ? 1 : 3})` }))} />;
  return <BarsChart data={data} x={chart.x} xFormatter={fmt.label} format={format} height={280} series={chart.series} colors={(_, i) => `var(--chart-${(i % 6) + 1})`} />;
}

function ReportTable({ report, loading }) {
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  useEffect(() => { setPage(1); setSort(null); }, [report?.columns]);

  const rows = useMemo(() => {
    if (!report) return [];
    const r = [...report.rows];
    if (sort) r.sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * (sort.dir === 'asc' ? 1 : -1));
    return r;
  }, [report, sort]);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const slice = rows.slice((page - 1) * limit, page * limit);
  const toggle = (key) => setSort((s) => (s?.key === key ? (s.dir === 'desc' ? { key, dir: 'asc' } : null) : { key, dir: 'desc' }));

  return (
    <Card className="mt-6 p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-6">
        <div>
          <h3 className="text-base font-bold text-ink">Report data</h3>
          <p className="text-xs text-muted">{loading ? 'Loading…' : `${fmt.number(total)} rows · click a header to sort`}</p>
        </div>
        {report?.note && (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-info/10 px-3 py-1.5 text-xs font-medium text-info"><Info className="h-3.5 w-3.5" /> {report.note}</p>
        )}
      </div>
      <div className="scroll-x mt-4">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-y border-line bg-surface-2/60 text-[11px] font-bold uppercase tracking-wider text-muted">
              {(report?.columns || []).map((c) => {
                const active = sort?.key === c.key;
                const I = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                const numeric = ['currency', 'number', 'percent'].includes(c.format);
                return (
                  <th key={c.key} className={cn('px-4 py-3 first:pl-6 last:pr-6', numeric && 'text-right')}>
                    <button onClick={() => toggle(c.key)} className={cn('inline-flex items-center gap-1 hover:text-ink focus-ring rounded', active && 'text-brand')}>
                      {c.label} <I className={cn('h-3 w-3', !active && 'opacity-40')} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-line/60">{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>)}</tr>
                ))
              : slice.map((row, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
                    {report.columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-2.5 text-ink first:pl-6 last:pr-6', ['currency', 'number', 'percent'].includes(c.format) && 'text-right tabular')}>
                        {c.format === 'status' ? <Badge status={row[c.key]} /> : formatBy(c.format, row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && !total && <EmptyState title="No rows for these filters" description="Widen the date range or clear a filter." className="py-10" />}
      </div>
      {!loading && total > 0 && <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />}
    </Card>
  );
}
