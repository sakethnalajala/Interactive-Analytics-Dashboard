import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Boxes, AlertTriangle, Star, PieChart, Plus, Pencil, Archive, MoreHorizontal } from 'lucide-react';
import { useDateRange } from '@/hooks/useDateRange';
import { useTableParams } from '@/hooks/useTableParams';
import { useProducts, useProductStats, useProductFilters, useCreateProduct, useUpdateProduct, useArchiveProduct } from '@/api/queries';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { ChartCard, BarsChart } from '@/components/charts';
import { DataTable } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { Modal, ConfirmDialog, Dropdown, DropdownItem } from '@/components/ui/Overlay';
import { PageHeader, Badge, Button, Input, Select, Card, CardHeader, Skeleton } from '@/components/ui';
import { useAuthStore, can } from '@/stores/authStore';
import { toast } from '@/stores/uiStore';
import { fmt, cn } from '@/utils/format';
import { rangeLabel } from '@/utils/dates';

const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(120),
    sku: z.string().trim().min(3, 'SKU is too short').max(24).regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and dashes only'),
    category: z.string().min(1, 'Choose a category'),
    price: z.coerce.number({ invalid_type_error: 'Enter a price' }).min(0, 'Must be ≥ 0'),
    cost: z.coerce.number({ invalid_type_error: 'Enter a cost' }).min(0, 'Must be ≥ 0'),
    stock: z.coerce.number({ invalid_type_error: 'Enter stock' }).int('Whole number').min(0),
    description: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.cost <= d.price, { message: 'Cost should not exceed price', path: ['cost'] });

export default function ProductsPage() {
  const range = useDateRange();
  const role = useAuthStore((s) => s.user?.role);
  const editor = can.edit(role);
  const stats = useProductStats(range);
  const filters = useProductFilters();
  const params = useTableParams({ category: '', status: '', sort: 'createdAt' });
  const query = { page: params.page, limit: params.limit, sort: params.sort, order: params.order, ...(params.search && { search: params.search }), ...(params.category && { category: params.category }), ...(params.status && { status: params.status }) };
  const list = useProducts(query);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [archiving, setArchiving] = useState(null);
  const archive = useArchiveProduct();
  const k = stats.data?.kpis;
  const threshold = stats.data?.lowStockThreshold ?? 15;

  const columns = [
    { key: 'name', label: 'Product', sortable: true, render: (p) => (
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)` }}>
            <Package className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className={cn('block truncate font-semibold text-ink', !p.isActive && 'line-through opacity-60')}>{p.name}</span>
            <span className="block text-xs text-muted">{p.sku}</span>
          </span>
        </span>
      ) },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'price', label: 'Price', sortable: true, align: 'right', render: (p) => <span className="font-semibold">{fmt.currency(p.price)}</span> },
    { key: 'stock', label: 'Stock', sortable: true, align: 'right', render: (p) => (
        <span className={cn('inline-flex items-center gap-1.5 font-semibold', p.stock === 0 ? 'text-danger' : p.stock <= threshold ? 'text-warning' : 'text-ink')}>
          {p.stock <= threshold && <AlertTriangle className="h-3.5 w-3.5" />}
          {fmt.number(p.stock)}
        </span>
      ) },
    { key: 'unitsSold', label: 'Sold', align: 'right', render: (p) => fmt.number(p.unitsSold) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (p) => fmt.currency(p.revenue, { compact: true }) },
    { key: 'rating', label: 'Rating', sortable: true, align: 'right', render: (p) => (
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {p.rating.toFixed(1)}
        </span>
      ) },
    { key: 'isActive', label: 'Status', render: (p) => <Badge status={p.isActive ? 'active' : 'archived'} /> },
    ...(editor
      ? [{ key: 'actions', label: '', width: 48, render: (p) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown trigger={<button className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-ring" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></button>}>
                <DropdownItem icon={Pencil} onClick={() => setEditing(p)}>Edit</DropdownItem>
                {p.isActive && <DropdownItem icon={Archive} danger onClick={() => setArchiving(p)}>Archive</DropdownItem>}
              </Dropdown>
            </div>
          ) }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description={`Catalogue performance · ${rangeLabel(range.from, range.to)}`}
        actions={editor && <Button icon={Plus} onClick={() => setEditing('new')}>Add product</Button>}
      />

      <KpiGrid cols={5}>
        <KpiCard loading={stats.isLoading} label="Active products" value={k?.activeProducts.value} icon={Package} tone="brand" hint="In catalogue" />
        <KpiCard loading={stats.isLoading} label="Units sold" value={k?.unitsSold.value} previous={k?.unitsSold.previous} change={k?.unitsSold.change} icon={Boxes} tone="info" />
        <KpiCard loading={stats.isLoading} label="Low stock" value={k?.lowStock.value} icon={AlertTriangle} tone="warning" hint={`≤ ${threshold} units`} />
        <KpiCard loading={stats.isLoading} label="Avg. rating" value={k?.avgRating.value} format="rating" icon={Star} tone="success" hint="Across active products" />
        <KpiCard loading={stats.isLoading} label="Gross margin" value={k?.grossMargin.value} previous={k?.grossMargin.previous} change={k?.grossMargin.change} format="percent" icon={PieChart} tone="brand" />
      </KpiGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Category performance" subtitle="Revenue and profit by category · click a bar to filter the table" loading={stats.isLoading} error={stats.isError && stats.error} onRetry={stats.refetch} empty={stats.data && !stats.data.categories.length} height={300}>
          {stats.data && <BarsChart data={stats.data.categories} x="category" format="currency" showLegend series={[{ key: 'revenue', label: 'Revenue' }, { key: 'profit', label: 'Profit', color: 'var(--chart-3)' }]} onBarClick={(d) => params.update({ category: d.category })} />}
        </ChartCard>
        <Card>
          <CardHeader title="Category stats" subtitle="Units, margin and stock" />
          {stats.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <div className="scroll-x">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Units</th>
                    <th className="pb-2 text-right">Margin</th>
                    <th className="pb-2 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.data?.categories.map((c) => (
                    <tr key={c.category} className="border-t border-line/60">
                      <td className="w-full max-w-0 truncate py-2 font-semibold text-ink">{c.category}</td>
                      <td className="py-2 text-right tabular">{fmt.number(c.units)}</td>
                      <td className="py-2 text-right tabular text-success">{fmt.percent(c.margin)}</td>
                      <td className="py-2 text-right tabular text-muted">{fmt.number(c.stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink">Catalogue</h2>
        <FilterBar
          params={params}
          searchPlaceholder="Search by name or SKU…"
          exportUrl="/products/export"
          exportParams={{ ...query, page: undefined, limit: undefined }}
          selects={[
            { key: 'category', label: 'Category', options: (filters.data?.categories || []).map((c) => ({ value: c, label: c })) },
            { key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'low_stock', label: 'Low stock' }, { value: 'archived', label: 'Archived' }] },
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
          onRowClick={editor ? (p) => setEditing(p) : undefined}
          emptyTitle="No products found"
        />
      </div>

      <ProductModal product={editing} categories={filters.data?.categories || []} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title="Archive product?"
        description={`"${archiving?.name}" will be hidden from the active catalogue. Past orders keep their history.`}
        confirmLabel="Archive"
        danger
        loading={archive.isPending}
        onConfirm={() =>
          archive.mutate(archiving.id, {
            onSuccess: () => {
              toast.success('Product archived');
              setArchiving(null);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}

function ProductModal({ product, categories, onClose }) {
  const isNew = product === 'new';
  const open = !!product;
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(productSchema) });

  useEffect(() => {
    if (!open) return;
    reset(isNew ? { name: '', sku: '', category: '', price: '', cost: '', stock: 0, description: '' } : { name: product.name, sku: product.sku, category: product.category, price: product.price, cost: product.cost, stock: product.stock, description: product.description || '' });
  }, [open, product, isNew, reset]);

  const onSubmit = async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync({ id: product.id, ...values });
      toast.success(isNew ? 'Product created' : 'Product updated');
      onClose();
    } catch (e) {
      if (e.details?.length) e.details.forEach((d) => d.path && setError(d.path, { message: d.message }));
      else if (e.status === 409) setError('sku', { message: e.message });
      else toast.error(e.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Add product' : 'Edit product'} description={isNew ? 'Create a new catalogue item.' : product?.sku} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input id="p-name" label="Name" className="sm:col-span-2" error={errors.name?.message} {...register('name')} />
        <Input id="p-sku" label="SKU" placeholder="ELE-0001" error={errors.sku?.message} {...register('sku')} />
        <Select id="p-cat" label="Category" error={errors.category?.message} {...register('category')}>
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Input id="p-price" label="Price" type="number" step="0.01" min="0" error={errors.price?.message} {...register('price')} />
        <Input id="p-cost" label="Cost" type="number" step="0.01" min="0" error={errors.cost?.message} {...register('cost')} />
        <Input id="p-stock" label="Stock" type="number" step="1" min="0" error={errors.stock?.message} {...register('stock')} />
        <div className="sm:col-span-2">
          <label htmlFor="p-desc" className="label">Description</label>
          <textarea id="p-desc" rows={3} className="input resize-none" {...register('description')} />
          {errors.description && <p className="mt-1 text-xs text-danger">{errors.description.message}</p>}
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isNew ? 'Create product' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}
