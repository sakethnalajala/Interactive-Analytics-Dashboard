import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const rangeKey = (r) => ({ from: r.from, to: r.to, ...(r.granularity ? { granularity: r.granularity } : {}) });
const analyticsOpts = { staleTime: 60_000, placeholderData: keepPreviousData };

// ---------------------------------------------------------------- dashboards
export const useOverview = (range) => useQuery({ queryKey: ['overview', rangeKey(range)], queryFn: () => get('/dashboard/overview', rangeKey(range)), ...analyticsOpts });
export const useEngagement = (range) => useQuery({ queryKey: ['engagement', rangeKey(range)], queryFn: () => get('/analytics/engagement', rangeKey(range)), ...analyticsOpts });
export const useFunnel = (range) => useQuery({ queryKey: ['funnel', rangeKey(range)], queryFn: () => get('/analytics/funnel', rangeKey(range)), ...analyticsOpts });
export const useRevenue = (range) => useQuery({ queryKey: ['revenue', rangeKey(range)], queryFn: () => get('/revenue', rangeKey(range)), ...analyticsOpts });
export const useRevenueTrend = (range) => useQuery({ queryKey: ['revenueTrend', rangeKey(range)], queryFn: () => get('/revenue/trend', rangeKey(range)), ...analyticsOpts });
export const useCustomerStats = (range) => useQuery({ queryKey: ['customerStats', rangeKey(range)], queryFn: () => get('/customers/stats', rangeKey(range)), ...analyticsOpts });
export const useProductStats = (range) => useQuery({ queryKey: ['productStats', rangeKey(range)], queryFn: () => get('/products/stats', rangeKey(range)), ...analyticsOpts });
export const useOrderStats = (range) => useQuery({ queryKey: ['orderStats', rangeKey(range)], queryFn: () => get('/orders/stats', rangeKey(range)), ...analyticsOpts });

// ---------------------------------------------------------------- lists
const listOpts = { staleTime: 30_000, placeholderData: keepPreviousData };
export const useCustomers = (params) => useQuery({ queryKey: ['customers', params], queryFn: () => get('/customers', params), ...listOpts });
export const useCustomer = (id) => useQuery({ queryKey: ['customer', id], queryFn: () => get(`/customers/${id}`), enabled: !!id });
export const useCustomerFilters = () => useQuery({ queryKey: ['customerFilters'], queryFn: () => get('/customers/filters'), staleTime: Infinity });

export const useProducts = (params) => useQuery({ queryKey: ['products', params], queryFn: () => get('/products', params), ...listOpts });
export const useProductFilters = () => useQuery({ queryKey: ['productFilters'], queryFn: () => get('/products/filters'), staleTime: Infinity });

export const useOrders = (params) => useQuery({ queryKey: ['orders', params], queryFn: () => get('/orders', params), ...listOpts });
export const useOrder = (id) => useQuery({ queryKey: ['order', id], queryFn: () => get(`/orders/${id}`), enabled: !!id });
export const useOrderFilters = () => useQuery({ queryKey: ['orderFilters'], queryFn: () => get('/orders/filters'), staleTime: Infinity });

// ---------------------------------------------------------------- mutations
function useInvalidating(fn, keys) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
const PRODUCT_KEYS = ['products', 'productStats', 'overview', 'revenue'];
export const useCreateProduct = () => useInvalidating((body) => post('/products', body), PRODUCT_KEYS);
export const useUpdateProduct = () => useInvalidating(({ id, ...body }) => patch(`/products/${id}`, body), PRODUCT_KEYS);
export const useArchiveProduct = () => useInvalidating((id) => del(`/products/${id}`), PRODUCT_KEYS);
export const useUpdateOrderStatus = () =>
  useInvalidating(({ id, status }) => patch(`/orders/${id}/status`, { status }), ['orders', 'order', 'orderStats', 'overview', 'revenue', 'customers', 'customerStats']);

// ---------------------------------------------------------------- reports
export const useReportTypes = () => useQuery({ queryKey: ['reportTypes'], queryFn: () => get('/reports/types'), staleTime: Infinity });
export const useReport = (type, params) => useQuery({ queryKey: ['report', type, params], queryFn: () => get(`/reports/${type}`, params), enabled: !!type, ...analyticsOpts });

// ---------------------------------------------------------------- account
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => get('/settings'), staleTime: 5 * 60_000 });
export const useUpdateSettings = () => useInvalidating((body) => patch('/settings', body), ['settings', 'productStats']);
export const useTeam = (enabled) => useQuery({ queryKey: ['team'], queryFn: () => get('/settings/users'), enabled });
export const useCreateUser = () => useInvalidating((body) => post('/settings/users', body), ['team']);
export const useUpdateUser = () => useInvalidating(({ id, ...body }) => patch(`/settings/users/${id}`, body), ['team']);

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({ mutationFn: (body) => patch('/profile', body), onSuccess: (data) => setUser(data.user) });
}
export const useChangePassword = () => useMutation({ mutationFn: (body) => patch('/profile/password', body) });
