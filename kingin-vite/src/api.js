import axios from 'axios';

const isProduction = !window.location.host.includes('localhost:5173') && !window.location.host.includes('127.0.0.1:5173');
const api = axios.create({
  baseURL: isProduction ? 'http://127.0.0.1:8080/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kingin_jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add control token for engine management
    config.headers['X-Control-Token'] = 'replit-local-control';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect/prompt login if needed
      localStorage.removeItem('kingin_jwt');
      window.location.reload(); 
    }
    return Promise.reject(error);
  }
);

export default api;
