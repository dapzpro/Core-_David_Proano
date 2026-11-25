import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sesión vencida: volvemos al login (excepto si el 401 vino del propio login)
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(err);
  },
);

export const errMsg = (err) => {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m || (err?.response ? 'Ocurrió un error inesperado' : 'No hay conexión con el servidor');
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.assign('/login');
};

export default api;
