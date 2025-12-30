import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // 👈 important for sending refresh token cookie
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // const originalRequest = error.config;

    // if (error.response?.status === 401 && !originalRequest._retry) {
    //   originalRequest._retry = true;
    //   try {
    //     // 👇 refresh relies on cookie, not headers
    //     const { data } = await api.post('/token/refresh', {}, { withCredentials: true });

    //     localStorage.setItem('accessToken', data.access_token);
    //     api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

    //     return api(originalRequest);
    //   } catch (refreshError) {
    //     localStorage.removeItem('accessToken');
    //     window.location.href = '/';
    //     return Promise.reject(refreshError);
    //   }
    // }

    return Promise.reject(error);
  }
);
