// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage'; // 假设你创建了这些页面组件
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ArticleListPage from './pages/ArticleListPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import ArticleCreatePage from './pages/ArticleCreatePage'; // 这个页面会用到 ArticleForm
import ArticleEditPage from './pages/ArticleEditPage';   // 这个页面也会用到 ArticleForm
import Navbar from './components/common/Navbar'; // <-- 引入 Navbar


function App() {
  return (
    <Router>
      {/* <Navbar /> */} {/* 在这里或布局组件中添加导航栏 */}
      <Navbar /> {/* <-- 在这里渲染 Navbar */}
      <div className="container" style={{ padding: '20px' }}> {/* 添加一点内边距 */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/articles" element={<ArticleListPage />} /> {/* 文章列表 */}
          <Route path="/articles/country/:countrySlug" element={<ArticleListPage />} /> {/* 按国家分类的文章列表 */}
          {/* 其他路由，例如用户中心 */}
          {/* 当用户访问 /articles/new 时，渲染 ArticleCreatePage 组件 */}
          <Route path="/articles/new" element={<ArticleCreatePage />} /> {/* 创建文章页 */}
          {/* 路由配置：文章详情页 */}
          {/* 当用户访问 /articles/后跟任意字符(slug) 时，渲染 ArticleDetailPage 组件 */}
          {/* :slug 是一个动态参数，可以在 ArticleDetailPage 组件中通过 useParams() 获取 */}
          <Route path="/articles/:slug" element={<ArticleDetailPage />} /> {/* 文章详情页 */}
          <Route path="/articles/:slug/edit" element={<ArticleEditPage />} /> {/* 编辑文章页 */}    
          
        </Routes>
      </div>
      {/* 在这里或布局组件中添加页脚 */}
    </Router>
  );
}

export default App;