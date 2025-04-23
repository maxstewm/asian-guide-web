// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react'; // <--- 确保引入 useMemo
import authService from '../services/authService';
// import api from '../services/api'; // 如果没用到可以移除

// 创建 Context 对象
export const AuthContext = createContext(null);

// 创建 Provider 组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(authService.getCurrentUserToken());
  const [isLoading, setIsLoading] = useState(true);

  // --- fetchUser 函数，用 useCallback 包裹 ---
  // 这个函数依赖 user 状态来比较 id，所以需要将 user 加入依赖
  // 或者只依赖 user.id，但需要处理 user 为 null 的情况
  const fetchUser = useCallback(async () => {
    const currentToken = authService.getCurrentUserToken();
    console.log("AuthProvider: fetchUser called. Token:", currentToken ? "exists" : "null"); // 调试日志
    if (currentToken) {
      try {
        const userInfo = await authService.getCurrentUserInfo();
        console.log("AuthProvider: Fetched user info:", userInfo); // 调试日志
        // --- 优化 setUser 调用 ---
        setUser(currentUser => {
            // 只有当获取到的用户信息与当前用户状态真正不同时才更新
            // 比较 ID 和其他你关心的字段，或者简单比较 ID
            if (userInfo && (!currentUser || currentUser.id !== userInfo.id)) {
                 console.log("AuthProvider: Setting user state:", userInfo);
                 return userInfo;
            } else if (!userInfo && currentUser !== null) {
                 console.log("AuthProvider: Setting user state to null (fetch failed or invalid).");
                 return null; // 获取失败或无效，且当前 user 不是 null，则设为 null
            }
            // 如果信息相同或获取失败且当前已是 null，则不改变状态，避免不必要的渲染
            console.log("AuthProvider: User state remains unchanged.");
            return currentUser;
        });
        // 如果获取失败或 Token 无效导致 userInfo 为 null，也需要清除 token
        if (!userInfo) {
            setToken(null); // 清除 token 状态
            // 注意：authService.logout() 包含了清除 localStorage 的逻辑，这里不需要重复调用，
            // 但如果 getCurrentUserInfo 内部没有调用 logout，这里可能需要手动清除 localStorage
            // localStorage.removeItem('authToken');
        }

      } catch (error) {
        console.error("AuthProvider: Failed to fetch user in fetchUser", error);
        setUser(null); // 出错时设为 null
        setToken(null); // 出错时清除 token
      }
    } else {
      // 没有 Token
      if (user !== null) setUser(null); // 确保 user 是 null
    }
    setIsLoading(false); // 加载完成
    console.log("AuthProvider: fetchUser finished. Loading state:", false); // 调试日志
  // useCallback 的依赖项应该包含所有外部依赖的状态或函数
  // 因为 fetchUser 内部逻辑读取了 user state 来决定是否更新，所以 user 需要是依赖
  }, [user]); // <-- 依赖 user state


  // --- 组件加载时执行一次 fetchUser ---
  useEffect(() => {
    fetchUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- **重要：初始加载只执行一次，依赖项设为空数组**
          // fetchUser 本身是通过 useCallback 创建的，其依赖项会管理它的更新，
          // 这里不需要再依赖 fetchUser，否则可能引入循环。

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

  // --- 退出登录函数，用 useCallback 包裹 ---
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []); // 没有外部依赖

  // --- 使用 useMemo 来稳定 value 对象 ---
  const value = useMemo(() => {
    console.log("AuthProvider: Creating new context value. User:", user, "Token:", token, "Loading:", isLoading); // 调试日志
    return {
        user,
        token,
        isLoggedIn: !!user, // 根据 user 状态计算
        isLoading,
        login,
        logout
    };
// value 对象依赖这些状态和函数的变化
}, [user, token, isLoading, login, logout]); // <--- 确保 login, logout 在依赖项中


  // 返回 Provider，包裹子组件
  // 只有在非初始加载状态时才渲染子组件，确保用户信息已尝试加载
  return (
    <AuthContext.Provider value={value}>
      {/* {!isLoading && children} */} {/* 暂时移除 !isLoading 条件，先确保渲染 */}
      {children} {/* 直接渲染 children，加载状态由消费者组件自己处理 */}
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