import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('riq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('riq_token');
      localStorage.removeItem('riq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const scanAPI = {
  create: (formData) => api.post('/scans', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStatus: (id) => api.get(`/scans/${id}/status`),
  getResult: (id) => api.get(`/scans/${id}`),
  getJobs: (id, params) => api.get(`/scans/${id}/jobs`, { params }),
  list: () => api.get('/scans'),
};

export default api;