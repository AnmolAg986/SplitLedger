import axios from 'axios';
import { useAuthStore } from '../../app/store/useAuthStore';

export const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept 401s that are just login failures
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw error; // throw original to preserve the message

        const { data } = await axios.post('http://localhost:3000/auth/refresh', { refreshToken });
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error); // reject original error to maintain payload
      }
    }
    return Promise.reject(error);
  }
);
