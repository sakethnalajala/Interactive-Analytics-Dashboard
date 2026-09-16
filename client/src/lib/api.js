import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 20000 });

// Attach the in-memory access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Silent refresh: one refresh call is shared by every request that 401s at the same time.
let refreshing = null;
export async function refreshAccessToken() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
      .then(({ data }) => {
        useAuthStore.getState().setSession(data.data.user, data.data.accessToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const isAuthRoute = config?.url?.startsWith('/auth/');
    if (response?.status === 401 && !config._retried && !isAuthRoute) {
      config._retried = true;
      try {
        const token = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      } catch {
        useAuthStore.getState().clearSession();
      }
    }
    return Promise.reject(normaliseError(error));
  },
);

/** Every rejected promise from `api` has { status, code, message, details }. */
export function normaliseError(error) {
  if (error?.response?.data?.error) {
    const e = error.response.data.error;
    return Object.assign(new Error(e.message), { status: error.response.status, code: e.code, details: e.details });
  }
  if (error?.code === 'ECONNABORTED') return Object.assign(new Error('The request timed out. Please try again.'), { status: 0, code: 'TIMEOUT' });
  if (!error?.response) {
    // No HTTP response at all: offline, wrong VITE_API_URL, or a CORS preflight rejected by the API (CLIENT_URL mismatch).
    const host = (() => { try { return new URL(API_BASE, window.location.origin).host; } catch { return API_BASE; } })();
    return Object.assign(new Error(`Cannot reach the API at ${host}. Check your connection, or the deployment's VITE_API_URL / CLIENT_URL (CORS) settings.`), { status: 0, code: 'NETWORK' });
  }
  return Object.assign(new Error(error.message || 'Unexpected error'), { status: error.response?.status, code: 'UNKNOWN' });
}

/** Unwraps the { success, data } envelope. */
export const get = (url, params) => api.get(url, { params }).then((r) => r.data.data);
export const post = (url, body) => api.post(url, body).then((r) => r.data.data);
export const patch = (url, body) => api.patch(url, body).then((r) => r.data.data);
export const del = (url) => api.delete(url).then((r) => r.data.data);

/** Downloads a CSV export (auth header included) and triggers a browser save. */
export async function downloadCsv(url, params, fallbackName = 'export.csv') {
  const res = await api.get(url, { params, responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = Object.assign(document.createElement('a'), { href, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  return name;
}
