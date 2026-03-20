import axios from 'axios';

// URL de l'API (définie sur Vercel pour la production)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🚀 API URL utilisée:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;