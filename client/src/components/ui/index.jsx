/**
 * Small UI primitives. Larger components (DataTable, Modal, Drawer, Dropdown)
 * live in their own files.
 */
import { forwardRef } from 'react';
import { AlertCircle, Inbox, RefreshCw, ChevronDown, X } from 'lucide-react';
import { cn, fmt } from '@/utils/format';
import { Button } from './Button';

export { Button };

// ---------------------------------------------------------------- Card
export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold leading-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Badge
const STATUS_TONE = {
  delivered: 'success',
  shipped: 'info',
  processing: 'brand',
  pending: 'warning',
  cancelled: 'danger',
  refunded: 'danger',
  active: 'success',
  archived: 'muted',
  vip: 'brand',
  regular: 'info',
  new: 'success',
  inactive: 'muted',
  super_admin: 'brand',
  admin: 'info',
  analyst: 'success',
  viewer: 'muted',
};
const TONES = {
  success: 'bg-success/12 text-success',
  info: 'bg-info/12 text-info',
  brand: 'bg-brand/12 text-brand',
  warning: 'bg-warning/15 text-[#b76e00] dark:text-warning',
  danger: 'bg-danger/12 text-danger',
  muted: 'bg-muted/15 text-muted',
};

export function Badge({ tone, status, children, className, dot = true }) {
  const t = tone || STATUS_TONE[status] || 'muted';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize leading-none', TONES[t], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children ?? fmt.label(status)}
    </span>
  );
}

// ---------------------------------------------------------------- Avatar
export function Avatar({ name, color = '#4318FF', size = 'md', className }) {
  const s = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', s, className)} style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }} aria-hidden>
      {fmt.initials(name)}
    </span>
  );
}

// ---------------------------------------------------------------- Inputs
export const Input = forwardRef(function Input({ className, error, label, hint, id, ...props }, ref) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input ref={ref} id={id} className={cn('input', error && 'border-danger/60 focus:border-danger')} aria-invalid={!!error} {...props} />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
});

export const Select = forwardRef(function Select({ className, error, label, id, children, ...props }, ref) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <select ref={ref} id={id} className={cn('input appearance-none pr-9', error && 'border-danger/60')} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
});

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-ring', checked ? 'bg-brand' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </label>
  );
}

// ---------------------------------------------------------------- Segmented control
export function Segmented({ options, value, onChange, size = 'sm', className }) {
  return (
    <div className={cn('inline-flex rounded-xl bg-surface-2 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-semibold transition-all focus-ring',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
            value === o.value ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Tabs
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-ring',
            value === t.value ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Chips
export function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-brand/15 focus-ring" aria-label="Remove filter">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- States
export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-base font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className, compact }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)} role="alert">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-bold text-ink">Something went wrong</p>
      <p className="mt-1 max-w-sm text-xs text-muted">{error?.message || 'Unable to load this data.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Page header
export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Progress bar
export function Progress({ value, max = 100, color = 'rgb(var(--brand))', className }) {
  const pct = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
