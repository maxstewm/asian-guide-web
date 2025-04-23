// frontend/src/pages/ArticleEditPage.js
import React from 'react';
import ArticleForm from '../components/article/ArticleForm';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import './ArticleDetailPage.css';

function ArticleEditPage() {
    //const { slug } = useParams(); // 获取 URL 中的 slug
    const { isLoggedIn, isLoading } = useAuth();

     if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isLoggedIn) {
        // 如果未登录，重定向到登录页
        // 编辑页的来源路径比较复杂，可以简单跳回首页或登录页
         return <Navigate to="/login" replace />;
    }

    return (
         <div className="article-edit-page" style={{ padding: '20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Edit Guide</h2>
            {/* 传入 isEditMode=true，ArticleForm 内部会根据 slug 加载数据 */}
            <ArticleForm isEditMode={true} />
        </div>
    );
}

export default ArticleEditPage;