const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('club');
    window.location.href = '/login';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
const del = (path) => request(path, { method: 'DELETE' });

export const api = {
  // Auth
  login: (data) => post('/auth/login', data),
  me: () => get('/auth/me'),
  updateProfile: (data) => put('/auth/me', data),
  changePassword: (data) => put('/auth/me/password', data),

  // Equipment
  equipment: () => get('/equipment'),
  createEquipment: (data) => post('/equipment', data),
  updateEquipment: (id, data) => put(`/equipment/${id}`, data),
  deleteEquipment: (id) => del(`/equipment/${id}`),
  safetyChecks: () => get('/equipment/safety-checks'),
  createSafetyCheck: (data) => post('/equipment/safety-checks', data),

  // Finance
  categories: () => get('/finance/categories'),
  createCategory: (data) => post('/finance/categories', data),
  transactions: (params = {}) => get('/finance/transactions?' + new URLSearchParams(params)),
  createTransaction: (data) => post('/finance/transactions', data),
  updateTransaction: (id, data) => put(`/finance/transactions/${id}`, data),
  deleteTransaction: (id) => del(`/finance/transactions/${id}`),
  financeSummary: (params = {}) => get('/finance/summary?' + new URLSearchParams(params)),

  // Students
  students: () => get('/students'),
  student: (id) => get(`/students/${id}`),
  createStudent: (data) => post('/students', data),
  updateStudent: (id, data) => put(`/students/${id}`, data),
  deleteStudent: (id) => del(`/students/${id}`),

  // Courses
  courses: () => get('/courses'),
  course: (id) => get(`/courses/${id}`),
  createCourse: (data) => post('/courses', data),
  updateCourse: (id, data) => put(`/courses/${id}`, data),
  deleteCourse: (id) => del(`/courses/${id}`),
  enrollStudent: (courseId, data) => post(`/courses/${courseId}/enroll`, data),
  updateEnrollment: (courseId, enrollId, data) => put(`/courses/${courseId}/enrollments/${enrollId}`, data),

  // Flights
  flights: (params = {}) => get('/flights?' + new URLSearchParams(params)),
  flight: (id) => get(`/flights/${id}`),
  createFlight: (data) => post('/flights', data),
  updateFlight: (id, data) => put(`/flights/${id}`, data),
  deleteFlight: (id) => del(`/flights/${id}`),
  flightStats: () => get('/flights/stats/summary'),

  // Marketing
  campaigns: () => get('/marketing'),
  campaign: (id) => get(`/marketing/${id}`),
  createCampaign: (data) => post('/marketing', data),
  updateCampaign: (id, data) => put(`/marketing/${id}`, data),
  deleteCampaign: (id) => del(`/marketing/${id}`),

  // Social
  posts: (params = {}) => get('/social?' + new URLSearchParams(params)),
  post: (id) => get(`/social/${id}`),
  createPost: (data) => post('/social', data),
  updatePost: (id, data) => put(`/social/${id}`, data),
  deletePost: (id) => del(`/social/${id}`),
  generatePost: (data) => post('/social/generate', data),
  campaignIdeas: (data) => post('/social/campaign-ideas', data),

  // Weather
  weatherCurrent: () => get('/weather/current'),
  weatherHistory: () => get('/weather/history'),
};
