// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
// import authService from '../services/authService'; // 不再直接调用 service
import { useAuth } from '../contexts/AuthContext'; // <-- 使用 AuthContext 的 Hook

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth(); // <-- 从 Context 获取 login 方法

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 调用 Context 提供的 login 方法
      await login({ email, password });
      // 登录成功后跳转 (Context 内部会处理 token 存储和用户状态更新)
      navigate(from, { replace: true });
    } catch (err) {
      // Context 的 login 方法会将 service 抛出的错误继续抛出
      setError(err.message || '登录时发生未知错误');
      setLoading(false);
    }
    // setLoading(false);
  };

  return (
    <div className="auth-page">
      <h2>登录</h2>
      <form onSubmit={handleSubmit}>
        {/* 显示错误信息 */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* --- Email 输入组 --- */}
        <div className="form-group">
          <label htmlFor="email">邮箱:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)} // 确保调用 setEmail
            required
            disabled={loading}
          />
        </div>

        {/* --- Password 输入组 --- */}
        <div className="form-group">
          <label htmlFor="password">密码:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} // 确保调用 setPassword
            required
            disabled={loading}
          />
        </div>

        {/* --- 提交按钮 --- */}
        <button type="submit" disabled={loading}>
          {loading ? '正在登录...' : '登录'}
        </button>
      </form>
      <p>
        还没有账号？ <Link to="/register">点此注册</Link>
      </p>
    </div>
  );
}

export default LoginPage;