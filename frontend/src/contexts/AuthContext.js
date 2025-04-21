// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import authService from '../services/authService';
import api from '../services/api'; // 导入 axios 实例以设置/清除默认 header (可选)

// 创建 Context 对象
export const AuthContext = createContext(null);

// 创建 Provider 组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // 存储用户信息 { id, username, email, ... }
  const [token, setToken] = useState(authService.getCurrentUserToken()); // 从 localStorage 初始化 Token
  const [isLoading, setIsLoading] = useState(true); // 初始加载状态

  // --- 核心逻辑：当 Token 变化时，尝试获取用户信息 ---
  const fetchUser = useCallback(async () => {
    const currentToken = authService.getCurrentUserToken();
    if (currentToken) {
      // (可选) 如果 api 实例不是每次请求都从 localStorage 取 token, 在这里设置一次
      // api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      try {
        const userInfo = await authService.getCurrentUserInfo();
        if (userInfo) {
          setUser(userInfo); // 获取成功，设置用户信息
        } else {
          // 获取失败 (可能 token 过期)，执行登出逻辑
          setUser(null);
          setToken(null);
          // delete api.defaults.headers.common['Authorization']; // 清除 axios header
        }
      } catch (error) {
        // 明确处理错误，防止无限循环或其他问题
        console.error("Context: Failed to fetch user on token change", error);
        setUser(null);
        setToken(null);
        // delete api.defaults.headers.common['Authorization']; // 清除 axios header
      }
    } else {
      // 没有 Token，确保用户状态为 null
      setUser(null);
      // delete api.defaults.headers.common['Authorization']; // 清除 axios header
    }
    setIsLoading(false); // 加载完成
  }, []); // useCallback 依赖为空数组

  // --- 组件加载时执行一次 fetchUser ---
  useEffect(() => {
    fetchUser();
  }, [fetchUser]); // 依赖 fetchUser (由于 useCallback，它基本不变)

  // --- 登录函数 ---
  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials); // 调用 service 登录并存储 token
      setToken(data.token); // 更新 context 中的 token
      await fetchUser(); // 登录成功后立即获取用户信息
      return true; // 返回成功状态
    } catch (error) {
      console.error("Context: Login failed", error);
      // 清理状态以防万一
      setUser(null);
      setToken(null);
      // delete api.defaults.headers.common['Authorization'];
      throw error; // 将 service 抛出的错误继续抛出给调用者 (LoginPage)
    }
  };

  // --- 退出登录函数 ---
  const logout = () => {
    authService.logout(); // 调用 service 清除 token
    setUser(null); // 清除 context 中的 user
    setToken(null); // 清除 context 中的 token
    // delete api.defaults.headers.common['Authorization']; // 清除 axios header
    // 跳转可以在组件中通过 navigate 实现，或者在这里 window.location.href = '/'
  };

  // --- 提供给子组件的值 ---
  const value = {
    user, // 当前用户信息 (或 null)
    token, // 当前 token (或 null)
    isLoggedIn: !!user, // 根据 user 是否存在判断登录状态 (更可靠)
    // isLoggedIn: !!token, // 或者简单地根据 token 判断 (不够实时)
    isLoading, // 是否正在加载用户信息
    login, // 登录方法
    logout // 退出登录方法
  };

  // 返回 Provider，包裹子组件
  // 只有在非初始加载状态时才渲染子组件，确保用户信息已尝试加载
  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// (可选) 创建一个自定义 Hook 方便使用 Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};