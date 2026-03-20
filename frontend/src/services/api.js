import axios from 'axios';

// Utilise la variable d'environnement VITE_API_URL si elle existe, sinon localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🚀 API URL utilisée:', API_URL);

// URL de base sans /api pour les uploads de fichiers
const BASE_URL = API_URL.replace('/api', '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000 // 30 secondes
});

// Ajouter baseURL à l'instance pour les uploads
api.defaults.baseURL = BASE_URL;

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;