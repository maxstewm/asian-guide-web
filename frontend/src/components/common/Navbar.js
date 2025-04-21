// frontend/src/components/common/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // <-- 使用自定义 Hook

function Navbar() {
  const { user, logout } = useAuth(); // 从 Context 获取 user 和 logout 方法
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // 调用 Context 提供的 logout 方法
    navigate('/'); // 退出后跳转到首页
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.navBrand}>
        <Link to="/" style={styles.navLink}>亚洲攻略</Link>
      </div>
      <ul style={styles.navList}>
        <li style={styles.navItem}>
          <Link to="/" style={styles.navLink}>首页</Link>
        </li>
        <li style={styles.navItem}>
          <Link to="/articles" style={styles.navLink}>所有攻略</Link>
        </li>
        {user ? (
          // --- 用户已登录 ---
          <>
            <li style={styles.navItem}>
              <Link to="/articles/new" style={styles.navLink}>发布攻略</Link>
            </li>
            {/* 可以添加下拉菜单或者直接显示 */}
            <li style={styles.navItem}>
              <span style={styles.userInfo}>你好, {user.username || user.email}!</span> {/* 显示用户名 */}
            </li>
            <li style={styles.navItem}>
              <Link to="/my-guides" style={styles.navLink}>我的攻略</Link> {/* 假设有这个页面 */}
            </li>
            <li style={styles.navItem}>
              <button onClick={handleLogout} style={styles.logoutButton}>退出登录</button>
            </li>
          </>
        ) : (
          // --- 用户未登录 ---
          <>
            <li style={styles.navItem}>
              <Link to="/login" style={styles.navLink}>登录</Link>
            </li>
            <li style={styles.navItem}>
              <Link to="/register" style={styles.navLink}>注册</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

// --- 简单的内联样式 (建议使用 CSS 文件或库) ---
const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
  },
  navBrand: {
    fontWeight: 'bold',
    fontSize: '1.2em',
  },
  navList: {
    listStyle: 'none',
    display: 'flex',
    margin: 0,
    padding: 0,
  },
  navItem: {
    marginLeft: '15px',
    display: 'flex',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: '#007bff',
  },
  userInfo: {
    color: '#6c757d',
    marginRight: '10px',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  }
};

export default Navbar;  