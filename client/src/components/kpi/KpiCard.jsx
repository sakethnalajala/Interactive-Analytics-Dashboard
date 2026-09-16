import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn, fmt } from '@/utils/format';
import { Skeleton } from '@/components/ui';
import { Sparkline } from '@/components/charts';

const FORMAT = {
  currency: (v) => fmt.currency(v, { compact: Math.abs(v) >= 1_000_000, digits: 0 }),
  number: (v) => fmt.number(v),
  percent: (v) => fmt.percent(v, 2),
  duration: (v) => fmt.duration(v),
  decimal: (v) => fmt.number(v, { digits: 2 }),
  rating: (v) => `${fmt.number(v, { digits: 2 })} ★`,
};

const TONES = {
  brand: 'bg-brand-soft text-brand',
  info: 'bg-info/12 text-info',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-[#b76e00] dark:text-warning',
  danger: 'bg-danger/12 text-danger',
};

/**
 * KPI tile: icon, label, big value, delta vs previous period, optional sparkline.
 * `invert` flips the delta colouring for metrics where lower is better.
 */
export function KpiCard({ label, value, change, previous, format = 'number', icon: Icon, tone = 'brand', spark, invert = false, loading, hint, compareLabel = 'vs previous period', className }) {
  if (loading) {
    return (
      <div className={cn('card p-5', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <Skeleton className="mt-4 h-3 w-40" />
      </div>
    );
  }
  const f = FORMAT[format] || FORMAT.number;
  const good = change === 0 || change == null ? null : invert ? change < 0 : change > 0;
  const DeltaIcon = change == null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  return (
    <div className={cn('card group p-5 transition-transform duration-200 hover:-translate-y-0.5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', TONES[tone])}>
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-muted">{label}</p>
            <p className="mt-0.5 truncate text-2xl font-extrabold leading-tight tabular text-ink" title={String(value)}>
              {f(value ?? 0)}
            </p>
          </div>
        </div>
        {spark?.length > 1 && (
          <div className="hidden shrink-0 sm:block">
            <Sparkline data={spark} color={good === false ? 'rgb(var(--danger))' : 'rgb(var(--brand))'} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {change != null && (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold', good == null ? 'bg-muted/15 text-muted' : good ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger')}>
            <DeltaIcon className="h-3 w-3" />
            {fmt.delta(change)}
          </span>
        )}
        <span className="truncate text-muted">{hint ?? (previous != null ? `${compareLabel} · ${f(previous)}` : compareLabel)}</span>
      </div>
    </div>
  );
}

export function KpiGrid({ children, cols = 4, className }) {
  const grid = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-3 xl:grid-cols-5', 6: 'lg:grid-cols-3 2xl:grid-cols-6' }[cols];
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', grid, className)}>{children}</div>;
}
