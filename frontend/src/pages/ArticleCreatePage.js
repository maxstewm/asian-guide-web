// frontend/src/pages/ArticleCreatePage.js
import React, { useState, useEffect } from 'react';
import ArticleForm from '../components/article/ArticleForm';
import { useNavigate } from 'react-router-dom';
import articleService from '../services/articleService';
// import authService from '../services/authService'; // 不再直接调用 service
import { useAuth } from '../contexts/AuthContext'; // <-- 使用 AuthContext 的 Hook

function ArticleCreatePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { isLoggedIn, isLoading: authLoading } = useAuth(); // <-- 从 Context 获取登录状态和加载状态

  // --- 检查登录状态 ---
  useEffect(() => {
    // 只有在 AuthContext 加载完成且用户未登录时才跳转
    if (!authLoading && !isLoggedIn) {
      alert("Please log in before creating an article!");
      // 跳转到登录页，并传递当前页面路径，以便登录后跳回
      navigate('/login', { state: { from: { pathname: '/articles/new' } } });
    }
  }, [isLoggedIn, authLoading, navigate]); // 依赖这些状态

  const handleCreateArticle = async (articleData) => {
    // 理论上到这里 isLoggedIn 应该是 true，但可以再加一层保险
     if (!isLoggedIn) {
         alert("Please log in...");
         navigate('/login');
         return;
     }

    setIsSubmitting(true);
    setError(null);
    try {
      const newArticle = await articleService.createArticle(articleData);
      alert('Article published successfully!');
      navigate(`/articles/${newArticle.slug}`);
    } catch (error) {
      setError('Failed to create article. Please check your input or try again later.');
      setIsSubmitting(false);
    }
  };

  // 如果 AuthContext 还在加载用户信息，可以显示加载状态
  if (authLoading) {
      return <div>Loading user status...</div>;
  }

  // 如果检查后确定未登录 (虽然 useEffect 会跳转，但可以防止瞬间渲染表单)
  if (!isLoggedIn) {
      // 理论上会被 useEffect 重定向，但可以返回 null 或提示信息
      return <div>请先登录...</div>;
  }

  // 确认登录后才渲染表单
  return (
    <div className="article-create-page">
      <h2>Create New Guide</h2>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <ArticleForm onSubmit={handleCreateArticle} isSubmitting={isSubmitting} />
    </div>
  );
}

export default ArticleCreatePage;