import Cookies from 'js-cookie';

const BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

function getToken() {
  return Cookies.get('token');
}

export function setToken(token: string) {
  Cookies.set('token', token, { expires: 7, sameSite: 'lax' });
}

export function clearToken() {
  Cookies.remove('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    return null as any;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export const api = {
  auth: {
    login: (data: { slug: string; email: string; password: string }) => post<any>('/auth/login', data),
    me: () => get<any>('/auth/me'),
  },
  students: {
    list: (status?: string) => get<any[]>(`/students${status ? `?status=${status}` : ''}`),
    get: (id: string) => get<any>(`/students/${id}`),
    stats: () => get<any>('/students/stats'),
    create: (data: any) => post<any>('/students', data),
    update: (id: string, data: any) => put<any>(`/students/${id}`, data),
    delete: (id: string) => del<any>(`/students/${id}`),
  },
  equipment: {
    list: (status?: string) => get<any[]>(`/equipment${status ? `?status=${status}` : ''}`),
    get: (id: string) => get<any>(`/equipment/${id}`),
    stats: () => get<any>('/equipment/stats'),
    create: (data: any) => post<any>('/equipment', data),
    update: (id: string, data: any) => put<any>(`/equipment/${id}`, data),
    delete: (id: string) => del<any>(`/equipment/${id}`),
    serviceOrders: (status?: string) => get<any[]>(`/equipment/service-orders${status ? `?status=${status}` : ''}`),
    createServiceOrder: (data: any) => post<any>('/equipment/service-orders', data),
    updateServiceOrder: (id: string, data: any) => put<any>(`/equipment/service-orders/${id}`, data),
  },
  courses: {
    list: () => get<any[]>('/courses'),
    get: (id: string) => get<any>(`/courses/${id}`),
    create: (data: any) => post<any>('/courses', data),
    update: (id: string, data: any) => put<any>(`/courses/${id}`, data),
    delete: (id: string) => del<any>(`/courses/${id}`),
    enroll: (courseId: string, studentId: string) => post<any>(`/courses/${courseId}/enroll`, { studentId }),
  },
  users: {
    list: () => get<any[]>('/users'),
  },
  weather: {
    current: (lat?: number, lon?: number, siteId?: string) =>
      get<any>(`/weather/current?lat=${lat || 32.08}&lon=${lon || 34.78}${siteId ? `&siteId=${siteId}` : ''}`),
    sites: () => get<any[]>('/weather/sites'),
    history: (siteId: string) => get<any[]>(`/weather/history/${siteId}`),
  },
};
