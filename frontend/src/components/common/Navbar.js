// frontend/src/components/common/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // 使用自定义 Hook
// import './Navbar.css'; // 如果你把样式移到了单独的 CSS 文件

function Navbar() {
  const { user, logout } = useAuth(); // 从 Context 获取 user 和 logout 方法
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // 调用 Context 提供的 logout 方法
    navigate('/'); // 退出后跳转到首页
  };

  return (
    // 使用 nav 语义化标签
    <nav style={styles.navbar}>
      {/* 网站品牌/Logo */}
      <div style={styles.navBrand}>
        {/* 链接到首页 */}
        <Link to="/" style={styles.navLinkBrand}>Asia Guides</Link> {/* 改为英文 */}
      </div>
      {/* 导航链接列表 */}
      <ul style={styles.navList}>
        {/* 首页链接 */}
        <li style={styles.navItem}>
          <Link to="/" style={styles.navLink}>Home</Link> {/* 改为英文 */}
        </li>
        {/* 所有攻略链接 */}
        <li style={styles.navItem}>
          <Link to="/articles" style={styles.navLink}>All Guides</Link> {/* 改为英文 */}
        </li>

        {/* 根据登录状态显示不同链接 */}
        {user ? (
          // --- 用户已登录 ---
          <>
            {/* 发布攻略链接 */}
            <li style={styles.navItem}>
              <Link to="/articles/new" style={styles.navLink}>Publish Guide</Link> {/* 改为英文 */}
            </li>
            {/* 我的攻略链接 */}
            <li style={styles.navItem}>
              <Link to="/my-guides" style={styles.navLink}>My Guides</Link> {/* 改为英文 */}
            </li>
            {/* 用户信息和退出 */}
            <li style={styles.navItem}>
              {/* 可以做一个下拉菜单，或者像现在这样并列 */}
              <span style={styles.userInfo}>Hi, {user.username || user.email}!</span> {/* 改为英文问候 */}
            </li>
            <li style={styles.navItem}>
              <button onClick={handleLogout} style={styles.logoutButton}>Logout</button> {/* 改为英文 */}
            </li>
            {/* 如果有个人资料页 */}
            {/* <li style={styles.navItem}>
              <Link to="/profile" style={styles.navLink}>Profile</Link>
            </li> */}
          </>
        ) : (
          // --- 用户未登录 ---
          <>
            {/* 登录链接 */}
            <li style={styles.navItem}>
              <Link to="/login" style={styles.navLink}>Login</Link> {/* 改为英文 */}
            </li>
            {/* 注册链接 */}
            <li style={styles.navItem}>
              <Link to="/register" style={styles.navLink}>Register</Link> {/* 改为英文 */}
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

// --- 内联样式 (保持不变或移到 CSS 文件) ---
const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 30px', // 增加左右 padding
    backgroundColor: '#ffffff', // 可以用白色背景
    borderBottom: '1px solid #e0e0e0', // 浅一点的边框
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)' // 加一点阴影
  },
  navBrand: {
    fontWeight: 'bold',
    fontSize: '1.4em', // 稍大一点
  },
  navLinkBrand: { // 单独给品牌链接样式
      textDecoration: 'none',
      color: '#333', // 深灰色
  },
  navList: {
    listStyle: 'none',
    display: 'flex',
    margin: 0,
    padding: 0,
    alignItems: 'center', // 垂直居中列表项
  },
  navItem: {
    marginLeft: '20px', // 增加链接间距
    display: 'flex',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: '#555', // 链接颜色
    padding: '8px 0', // 给链接一些垂直空间
    position: 'relative', // 为了下划线效果
  },
  // 添加简单的悬停下划线效果 (可选)
  navLink_after: {
      content: '""',
      position: 'absolute',
      width: '0',
      height: '2px',
      bottom: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#007bff',
      transition: 'width 0.3s ease',
  },
  navLink_hover_after: {
      width: '100%',
  },
  userInfo: {
    color: '#6c757d',
    marginRight: '15px', // 与按钮的间距
    fontSize: '0.9em',
  },
  logoutButton: {
    background: 'none',
    border: '1px solid #dc3545', // 加个边框
    color: '#dc3545',
    cursor: 'pointer',
    padding: '4px 8px', // 按钮内边距
    borderRadius: '4px', // 圆角
    fontSize: '0.9em',
    transition: 'background-color 0.2s ease, color 0.2s ease',
  },
  logoutButton_hover: {
      backgroundColor: '#dc3545',
      color: 'white',
  }
};

export default Navbar;