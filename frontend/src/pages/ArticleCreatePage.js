// frontend/src/pages/ArticleCreatePage.js
import React from 'react';
import ArticleForm from '../components/article/ArticleForm';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom'; // 用于重定向

function ArticleCreatePage() {
    const { isLoggedIn, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>; // 等待认证状态加载完成
    }

    if (!isLoggedIn) {
        // 如果未登录，重定向到登录页
        // 使用 state 传递来源路径，以便登录后跳回
        return <Navigate to="/login" state={{ from: { pathname: '/articles/new' } }} replace />;
    }

    // 登录后渲染表单 (isEditMode 默认为 false)
    return (
        <div className="article-create-page" style={{ padding: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Publish New Guide</h2>
        <ArticleForm />
        </div>
    );
}

export default ArticleCreatePage;