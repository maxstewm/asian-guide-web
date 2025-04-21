// frontend/src/services/authService.js
import api from './api'; // 引入配置好的 Axios 实例

// 应该在这里定义常量！！！ V V V
const AUTH_TOKEN_KEY = 'authToken'; // 统一定义存储 Token 的 Key

const authService = {
    register: async (userData) => {
        // userData 应该包含 { username, email, password }
        try {
          const response = await api.post('/auth/register', userData);
          // 注册成功后后端可能会返回用户信息，但不一定返回 token
          return response.data;
        } catch (error) {
          console.error('Registration failed:', error.response?.data || error.message);
          // 抛出后端返回的错误信息，或者一个通用错误
          throw new Error(error.response?.data?.message || '注册失败，请稍后再试');
        }
      },

    login: async (credentials) => {
        // credentials 应该包含 { email, password }
        try {
            const response = await api.post('/auth/login', credentials, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });
          if (response.data.token) {
            // 登录成功，存储 Token
            localStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
            // 设置 Axios 实例的默认 Authorization header (可选, 如果拦截器没做的话)
            // api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          } else {
            // 如果后端成功响应但没有 token，也算登录失败
            throw new Error('登录失败，未收到认证令牌');
          }
          return response.data; // 返回包含 Token 的响应
        } catch (error) {
          console.error('Login failed:', error.response?.data || error.message);
          // 清除可能存在的旧 Token
          localStorage.removeItem(AUTH_TOKEN_KEY);
          // delete api.defaults.headers.common['Authorization']; // 清除 axios 默认 header
          throw new Error(error.response?.data?.message || '登录失败，邮箱或密码错误');
        }
    },

    logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        // delete api.defaults.headers.common['Authorization']; // 清除 axios 默认 header
        // 这里可能还需要更新全局的用户状态 (如果使用 Context 或 Redux)
        console.log('User logged out');
      },

getCurrentUserToken: () => {
    return localStorage.getItem('authToken');
},

// 检查是否有 Token (表示可能已登录，但不保证 Token 有效)
isLoggedIn: () => {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
},

  // (可选) 获取当前登录用户信息 (需要Token)
  getCurrentUserInfo: async () => {
    try {
        // 确保 Token 已被 axios 拦截器添加
        const response = await api.get('/users/me');
        return response.data;
    } catch (error) {
        // 如果获取失败（例如 Token 过期或无效），可能需要清除 Token
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            authService.logout(); // 登出
        }
        console.error('Failed to get user info:', error.response?.data || error.message);
        return null; // 返回 null 表示未获取到或失败
    }
  }
};

export default authService;