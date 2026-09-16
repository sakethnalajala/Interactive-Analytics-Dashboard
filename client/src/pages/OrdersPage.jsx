import { useState } from 'react';
import { ShoppingCart, Clock, PackageCheck, XCircle, CreditCard, MapPin, Calendar, User } from 'lucide-react';
import { useDateRange } from '@/hooks/useDateRange';
import { useTableParams } from '@/hooks/useTableParams';
import { useOrders, useOrder, useOrderStats, useOrderFilters, useUpdateOrderStatus } from '@/api/queries';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { ChartCard, TrendChart, DonutChart, BarsChart, STATUS_COLORS } from '@/components/charts';
import { DataTable } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { Drawer } from '@/components/ui/Overlay';
import { PageHeader, Avatar, Badge, Button, Skeleton, Select } from '@/components/ui';
import { useAuthStore, can } from '@/stores/authStore';
import { toast } from '@/stores/uiStore';
import { fmt } from '@/utils/format';
import { rangeLabel } from '@/utils/dates';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function OrdersPage() {
  const range = useDateRange();
  const role = useAuthStore((s) => s.user?.role);
  const stats = useOrderStats(range);
  const filters = useOrderFilters();
  const params = useTableParams({ status: '', paymentMethod: '', sort: 'createdAt' });
  // The list is scoped to the global date range — except when searching, so a specific
  // order number / customer can always be found regardless of the selected period.
  const query = { page: params.page, limit: params.limit, sort: params.sort, order: params.order, ...(!params.search && { from: range.from, to: range.to }), ...(params.search && { search: params.search }), ...(params.status && { status: params.status }), ...(params.paymentMethod && { paymentMethod: params.paymentMethod }) };
  const list = useOrders(query);
  const [selected, setSelected] = useState(null);
  const k = stats.data?.kpis;
  const g = stats.data?.meta?.granularity || 'day';

  const columns = [
    { key: 'orderNumber', label: 'Order', sortable: true, render: (o) => <span className="font-bold text-brand">{o.orderNumber}</span> },
    { key: 'customerName', label: 'Customer', sortable: true, render: (o) => (
        <span className="flex items-center gap-3">
          <Avatar name={o.customerName} color="#39B8FF" size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{o.customerName}</span>
            <span className="block truncate text-xs text-muted">{o.customerEmail}</span>
          </span>
        </span>
      ) },
    { key: 'createdAt', label: 'Date', sortable: true, render: (o) => <span className="text-muted">{fmt.dateTime(o.createdAt)}</span> },
    { key: 'itemCount', label: 'Items', align: 'center' },
    { key: 'paymentMethod', label: 'Payment', render: (o) => fmt.label(o.paymentMethod) },
    { key: 'status', label: 'Status', sortable: true, render: (o) => <Badge status={o.status} /> },
    { key: 'total', label: 'Total', sortable: true, align: 'right', render: (o) => <span className="font-bold">{fmt.currency(o.total)}</span> },
  ];

  return (
    <>
      <PageHeader title="Orders" description={`Order volume & fulfilment · ${rangeLabel(range.from, range.to)}`} />

      <KpiGrid cols={4}>
        <KpiCard loading={stats.isLoading} label="Total orders" value={k?.totalOrders.value} previous={k?.totalOrders.previous} change={k?.totalOrders.change} icon={ShoppingCart} tone="brand" />
        <KpiCard loading={stats.isLoading} label="Awaiting fulfilment" value={k?.pending.value} previous={k?.pending.previous} change={k?.pending.change} icon={Clock} tone="warning" invert hint="Pending + processing" />
        <KpiCard loading={stats.isLoading} label="Fulfilment rate" value={k?.fulfillmentRate.value} previous={k?.fulfillmentRate.previous} change={k?.fulfillmentRate.change} format="percent" icon={PackageCheck} tone="success" hint="Shipped or delivered" />
        <KpiCard loading={stats.isLoading} label="Cancellation rate" value={k?.cancellationRate.value} previous={k?.cancellationRate.previous} change={k?.cancellationRate.change} format="percent" icon={XCircle} tone="danger" invert hint="Cancelled + refunded" />
      </KpiGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Orders over time" subtitle="Stacked by status" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} empty={stats.data && !stats.data.trend.some((p) => p.total)} height={300}>
          {stats.data && <TrendChart data={stats.data.trend} granularity={g} stacked height={300} series={STATUSES.map((s) => ({ key: s, label: fmt.label(s), color: STATUS_COLORS[s] }))} />}
        </ChartCard>
        <ChartCard title="Status distribution" subtitle="Click a status to filter the table" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} empty={stats.data && !stats.data.byStatus.some((s) => s.count)} height={300}>
          {stats.data && (
            <div className="space-y-2.5">
              {stats.data.byStatus.map((s) => (
                <button key={s.status} onClick={() => params.update({ status: params.status === s.status ? '' : s.status })} className="group block w-full text-left focus-ring rounded-lg">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold capitalize text-ink">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.status] }} /> {s.status}
                    </span>
                    <span className="text-muted">
                      <span className="font-bold tabular text-ink">{fmt.number(s.count)}</span> · {fmt.percent(s.share)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${s.share}%`, background: STATUS_COLORS[s.status] }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Payment methods" subtitle="Orders by payment method" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} height={240}>
          {stats.data && <DonutChart data={stats.data.byPayment} nameKey="method" valueKey="orders" centerLabel="Orders" height={200} />}
        </ChartCard>
        <ChartCard title="Sales channels" subtitle="Orders by channel" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} height={240}>
          {stats.data && <BarsChart data={stats.data.byChannel} x="channel" xFormatter={fmt.label} series={[{ key: 'orders', label: 'Orders' }]} colors={(_, i) => `var(--chart-${(i % 6) + 1})`} height={240} />}
        </ChartCard>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink">
          Order list <span className="ml-2 text-xs font-medium text-muted">{params.search ? 'Searching all time' : `Scoped to ${rangeLabel(range.from, range.to).toLowerCase()}`}</span>
        </h2>
        <FilterBar
          params={params}
          searchPlaceholder="Search order #, customer or email…"
          exportUrl="/orders/export"
          exportParams={{ ...query, page: undefined, limit: undefined }}
          selects={[
            { key: 'status', label: 'Status', options: filters.data?.statuses || STATUSES },
            { key: 'paymentMethod', label: 'Payment', options: filters.data?.paymentMethods || [] },
          ]}
        />
        <DataTable
          columns={columns}
          rows={list.data?.items}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error}
          onRetry={list.refetch}
          sort={params.sort}
          order={params.order}
          onSort={params.toggleSort}
          pagination={list.data?.pagination}
          onPage={(page) => params.update({ page })}
          onLimit={(limit) => params.update({ limit, page: 1 })}
          onRowClick={(o) => setSelected(o.id)}
          emptyTitle="No orders found"
          emptyDescription="Try a different status, search term or date range."
        />
      </div>

      <OrderDrawer id={selected} onClose={() => setSelected(null)} canEdit={can.edit(role)} />
    </>
  );
}

function OrderDrawer({ id, onClose, canEdit }) {
  const { data, isLoading } = useOrder(id);
  const update = useUpdateOrderStatus();
  const [next, setNext] = useState('');
  const allowed = data?.allowedTransitions || [];

  const save = () =>
    update.mutate(
      { id, status: next },
      {
        onSuccess: () => {
          toast.success(`Order marked as ${fmt.label(next)}`);
          setNext('');
        },
        onError: (e) => toast.error(e.message),
      },
    );

  return (
    <Drawer open={!!id} onClose={onClose} title={data ? `Order ${data.orderNumber}` : 'Order'}>
      {isLoading || !data ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge status={data.status} className="px-3 py-1.5 text-xs" />
            <span className="text-2xl font-extrabold tabular text-ink">{fmt.currency(data.total)}</span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info icon={User} label="Customer" value={data.customerName} sub={data.customerEmail} />
            <Info icon={Calendar} label="Placed" value={fmt.dateTime(data.createdAt)} />
            <Info icon={CreditCard} label="Payment" value={fmt.label(data.paymentMethod)} sub={fmt.label(data.channel)} />
            <Info icon={MapPin} label="Ship to" value={data.country} />
          </dl>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Items</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {data.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{it.name}</span>
                    <span className="block text-xs text-muted">{it.category} · {it.quantity} × {fmt.currency(it.unitPrice)}</span>
                  </span>
                  <span className="font-bold tabular text-ink">{fmt.currency(it.quantity * it.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 text-sm">
              <Row label="Subtotal" value={fmt.currency(data.subtotal)} />
              {data.discount > 0 && <Row label="Discount" value={`− ${fmt.currency(data.discount)}`} tone="text-success" />}
              <Row label="Tax" value={fmt.currency(data.tax)} />
              <Row label="Shipping" value={data.shipping ? fmt.currency(data.shipping) : 'Free'} />
              <Row label="Total" value={fmt.currency(data.total)} bold />
            </dl>
          </div>

          {canEdit && (
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Update status</p>
              {allowed.length ? (
                <div className="flex gap-2">
                  <Select value={next} onChange={(e) => setNext(e.target.value)} aria-label="New status">
                    <option value="">Choose…</option>
                    {allowed.map((s) => (
                      <option key={s} value={s}>{fmt.label(s)}</option>
                    ))}
                  </Select>
                  <Button disabled={!next} loading={update.isPending} onClick={save}>Apply</Button>
                </div>
              ) : (
                <p className="text-sm text-muted">This order is {data.status} — no further transitions are allowed.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Info({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"><Icon className="h-3.5 w-3.5" /> {label}</dt>
      <dd className="mt-1 truncate font-medium text-ink" title={value}>{value}</dd>
      {sub && <dd className="truncate text-xs text-muted">{sub}</dd>}
    </div>
  );
}
function Row({ label, value, bold, tone }) {
  return (
    <div className={`flex justify-between ${bold ? 'border-t border-line pt-2 text-base font-extrabold text-ink' : 'text-muted'}`}>
      <dt>{label}</dt>
      <dd className={`tabular ${tone || (bold ? '' : 'text-ink')}`}>{value}</dd>
    </div>
  );
}
