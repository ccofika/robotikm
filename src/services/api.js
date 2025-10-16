import axios from 'axios';
import { storage } from '../utils/storage';

// API URL - online backend
const API_URL = 'https://robotikb-3eov.onrender.com';

// Kreiraj axios instancu
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - dodaj token
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Cache busting
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime()
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err) => {
              reject(err);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const token = await storage.getItem('token');

      if (!token) {
        isRefreshing = false;
        await storage.removeItem('user');
        await storage.removeItem('token');
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const { token: newToken, user } = response.data;

        await storage.setItem('token', newToken);
        await storage.setItem('user', user);
        
        api.defaults.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await storage.removeItem('user');
        await storage.removeItem('token');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  refresh: () => api.post('/api/auth/refresh-token'),
};

// Technicians API
export const techniciansAPI = {
  getEquipment: (id) => api.get(`/api/technicians/${id}/equipment`),
  getMaterials: (id) => api.get(`/api/technicians/${id}/materials`),
  getBasicEquipment: (id) => api.get(`/api/technicians/${id}/basic-equipment`),
  getPendingEquipment: (id) => api.get(`/api/technicians/${id}/equipment/pending`),
  confirmEquipment: (id, data) => api.post(`/api/technicians/${id}/equipment/confirm`, data),
  rejectEquipment: (id, data) => api.post(`/api/technicians/${id}/equipment/reject`, data),
};

// Work Orders API
export const workOrdersAPI = {
  getTechnicianWorkOrders: (technicianId) => api.get(`/api/workorders/technician/${technicianId}`),
  getTechnicianOverdueWorkOrders: (technicianId) => api.get(`/api/workorders/technician/${technicianId}/overdue`),
  getOne: (id) => api.get(`/api/workorders/${id}`),
  updateByTechnician: (id, data) => api.put(`/api/workorders/${id}/technician-update`, data),
  updateUsedMaterials: (id, data) => api.post(`/api/workorders/${id}/used-materials`, data),
  getWorkOrderMaterials: (id) => api.get(`/api/workorders/${id}/materials`),
  updateUsedEquipment: (id, data) => api.post(`/api/workorders/${id}/used-equipment`, data),
  getUserEquipment: (id) => api.get(`/api/workorders/${id}/user-equipment`),
};

// User Equipment API
export const userEquipmentAPI = {
  getAll: () => api.get('/api/user-equipment'),
  getForUser: (userId) => api.get(`/api/user-equipment/user/${userId}`),
  getUserHistory: (userId) => api.get(`/api/user-equipment/user/${userId}/history`),
  getForWorkOrder: (workOrderId) => api.get(`/api/user-equipment/workorder/${workOrderId}`),
  getRemovedForWorkOrder: (workOrderId) => api.get(`/api/user-equipment/workorder/${workOrderId}/removed`),
  add: (data) => api.post('/api/user-equipment', data),
  remove: (id, data) => api.put(`/api/user-equipment/${id}/remove`, data),
  removeBySerial: (data) => api.post('/api/user-equipment/remove-by-serial', data),
};

export default api;
