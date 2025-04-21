// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api', // 从环境变量读取后端 API 基础 URL
});

// 添加请求拦截器，自动附加 JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // 从 localStorage 获取 Token (或其他存储方式)
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// (可选) 添加响应拦截器，处理全局错误，如 401 未授权跳转登录页
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // 处理未授权逻辑，例如清除 token 并跳转到登录页
      localStorage.removeItem('authToken');
      // window.location.href = '/login'; // 简单粗暴的跳转
    }
    return Promise.reject(error);
  }
);

export default api;