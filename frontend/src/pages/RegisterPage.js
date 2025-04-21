// frontend/src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import '../styles/AuthPage.css'; // 假设放在 styles 目录

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null); // 清除之前的错误
    setLoading(true);

    try {
      await authService.register({ username, email, password });
      alert('注册成功！请登录。');
      navigate('/login'); // 注册成功后跳转到登录页
    } catch (err) {
      setError(err.message || '注册时发生未知错误'); // 显示错误信息
      setLoading(false); // 允许用户重试
    }
    // 无论成功失败，如果组件没卸载，设置 loading 为 false (虽然成功时会跳转)
    // setLoading(false);
  };

  return (
    <div className="auth-page">
      <h2>注册新账号</h2>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div className="form-group">
          <label htmlFor="username">用户名:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">邮箱:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">密码:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6} // 添加简单的密码长度验证
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? '正在注册...' : '注册'}
        </button>
      </form>
      <p>
        已有账号？ <Link to="/login">点此登录</Link>
      </p>
    </div>
  );
}

export default RegisterPage;