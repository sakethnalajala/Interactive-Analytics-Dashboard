import { useState } from 'react';
import { Users, UserPlus, UserCheck, Wallet, ShoppingBag, Mail, MapPin, Calendar } from 'lucide-react';
import { useDateRange } from '@/hooks/useDateRange';
import { useTableParams } from '@/hooks/useTableParams';
import { useCustomers, useCustomer, useCustomerStats, useCustomerFilters } from '@/api/queries';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { ChartCard, TrendChart, DonutChart, BarsChart } from '@/components/charts';
import { DataTable } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { Drawer } from '@/components/ui/Overlay';
import { PageHeader, Avatar, Badge, Card, CardHeader, Skeleton, Progress } from '@/components/ui';
import { fmt } from '@/utils/format';
import { rangeLabel } from '@/utils/dates';

const SEGMENT_COLORS = { vip: 'var(--chart-1)', regular: 'var(--chart-2)', new: 'var(--chart-3)', inactive: 'var(--chart-6)' };

export default function CustomersPage() {
  const range = useDateRange();
  const stats = useCustomerStats(range);
  const params = useTableParams({ segment: '', country: '', sort: 'createdAt' });
  const filters = useCustomerFilters();
  const query = { page: params.page, limit: params.limit, sort: params.sort, order: params.order, ...(params.search && { search: params.search }), ...(params.segment && { segment: params.segment }), ...(params.country && { country: params.country }) };
  const list = useCustomers(query);
  const [selected, setSelected] = useState(null);
  const k = stats.data?.kpis;
  const g = stats.data?.meta?.granularity || 'day';

  const columns = [
    { key: 'name', label: 'Customer', sortable: true, render: (c) => (
        <span className="flex items-center gap-3">
          <Avatar name={c.name} color={c.avatarColor} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{c.name}</span>
            <span className="block truncate text-xs text-muted">{c.email}</span>
          </span>
        </span>
      ) },
    { key: 'country', label: 'Location', sortable: true, render: (c) => (
        <span>
          <span className="block text-ink">{c.country}</span>
          <span className="block text-xs text-muted">{c.city}</span>
        </span>
      ) },
    { key: 'segment', label: 'Segment', render: (c) => <Badge status={c.segment} /> },
    { key: 'orderCount', label: 'Orders', sortable: true, align: 'right' },
    { key: 'totalSpent', label: 'Total spent', sortable: true, align: 'right', render: (c) => <span className="font-semibold">{fmt.currency(c.totalSpent)}</span> },
    { key: 'lastOrderAt', label: 'Last order', sortable: true, render: (c) => <span className="text-muted">{c.lastOrderAt ? fmt.relative(c.lastOrderAt) : '—'}</span> },
    { key: 'createdAt', label: 'Joined', sortable: true, render: (c) => <span className="text-muted">{fmt.date(c.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Customers" description={`Customer growth & value · ${rangeLabel(range.from, range.to)}`} />

      <KpiGrid cols={5}>
        <KpiCard loading={stats.isLoading} label="Total customers" value={k?.totalCustomers.value} change={k?.totalCustomers.change} icon={Users} tone="brand" hint="Growth in this period" />
        <KpiCard loading={stats.isLoading} label="New customers" value={k?.newCustomers.value} previous={k?.newCustomers.previous} change={k?.newCustomers.change} icon={UserPlus} tone="success" />
        <KpiCard loading={stats.isLoading} label="Active buyers" value={k?.activeCustomers.value} previous={k?.activeCustomers.previous} change={k?.activeCustomers.change} icon={UserCheck} tone="info" hint="Placed an order in this period" />
        <KpiCard loading={stats.isLoading} label="Avg. lifetime value" value={k?.avgLifetimeValue.value} format="currency" icon={Wallet} tone="warning" hint="Mean total spend per customer" />
        <KpiCard loading={stats.isLoading} label="Avg. orders / customer" value={k?.avgOrdersPerCustomer.value} format="decimal" icon={ShoppingBag} tone="brand" hint="All time" />
      </KpiGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Customer growth" subtitle="New sign-ups per period and cumulative total" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} height={280}>
          {stats.data && <TrendChart data={stats.data.growth} granularity={g} height={280} series={[{ key: 'newCustomers', label: 'New customers', color: 'var(--chart-3)' }, { key: 'totalCustomers', label: 'Total customers' }]} />}
        </ChartCard>
        <ChartCard title="Segments" subtitle="All customers by segment" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} height={280}>
          {stats.data && <DonutChart data={stats.data.bySegment} nameKey="segment" valueKey="count" colors={(d) => SEGMENT_COLORS[d.segment]} centerLabel="Customers" height={220} />}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Customers by country" subtitle="Top markets by customer count" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} height={300}>
          {stats.data && <BarsChart data={stats.data.byCountry} x="country" layout="horizontal" series={[{ key: 'customers', label: 'Customers' }]} colors={(_, i) => `var(--chart-${(i % 6) + 1})`} height={300} onBarClick={(d) => params.update({ country: d.country })} />}
        </ChartCard>
        <Card>
          <CardHeader title="Top customers" subtitle="By revenue in this period" />
          {stats.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <ul className="space-y-3">
              {stats.data?.topCustomers.map((c, i) => (
                <li key={c.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <button onClick={() => setSelected(c.id)} className="flex min-w-0 items-center gap-2 text-left hover:text-brand focus-ring rounded">
                      <Avatar name={c.name} color={`var(--chart-${(i % 6) + 1})`} size="sm" />
                      <span className="truncate font-semibold">{c.name}</span>
                    </button>
                    <span className="shrink-0 font-bold tabular text-ink">{fmt.currency(c.revenue, { compact: true })}</span>
                  </div>
                  <Progress value={c.revenue} max={stats.data.topCustomers[0]?.revenue} color={`var(--chart-${(i % 6) + 1})`} className="h-1.5" />
                </li>
              ))}
              {stats.data && !stats.data.topCustomers.length && <p className="py-6 text-center text-sm text-muted">No purchases in this period.</p>}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink">All customers</h2>
        <FilterBar
          params={params}
          searchPlaceholder="Search by name or email…"
          exportUrl="/customers/export"
          exportParams={{ ...query, page: undefined, limit: undefined }}
          selects={[
            { key: 'segment', label: 'Segment', options: filters.data?.segments || [] },
            { key: 'country', label: 'Country', options: (filters.data?.countries || []).map((c) => ({ value: c, label: c })) },
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
          onRowClick={(c) => setSelected(c.id)}
          emptyTitle="No customers found"
        />
      </div>

      <CustomerDrawer id={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function CustomerDrawer({ id, onClose }) {
  const { data, isLoading } = useCustomer(id);
  return (
    <Drawer open={!!id} onClose={onClose} title="Customer details">
      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={data.name} color={data.avatarColor} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink">{data.name}</p>
              <Badge status={data.segment} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info icon={Mail} label="Email" value={data.email} />
            <Info icon={MapPin} label="Location" value={`${data.city}, ${data.country}`} />
            <Info icon={Calendar} label="Customer since" value={fmt.date(data.createdAt)} />
            <Info icon={ShoppingBag} label="Last order" value={data.lastOrderAt ? fmt.date(data.lastOrderAt) : '—'} />
          </dl>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2 p-4">
              <p className="text-xs font-semibold text-muted">Lifetime value</p>
              <p className="text-xl font-extrabold text-ink">{fmt.currency(data.totalSpent)}</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-4">
              <p className="text-xs font-semibold text-muted">Orders</p>
              <p className="text-xl font-extrabold text-ink">{fmt.number(data.orderCount)}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Recent orders</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    <span className="block font-semibold text-ink">{o.orderNumber}</span>
                    <span className="block text-xs text-muted">{fmt.date(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge status={o.status} />
                    <span className="font-bold tabular text-ink">{fmt.currency(o.total)}</span>
                  </span>
                </li>
              ))}
              {!data.recentOrders.length && <li className="px-4 py-6 text-center text-sm text-muted">No orders yet.</li>}
            </ul>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-1 truncate font-medium text-ink" title={value}>
        {value}
      </dd>
    </div>
  );
}
