// frontend/src/pages/ArticleDetailPage.js
import React, { useState, useEffect } from 'react'; // 假设未来会用 Context 获取用户信息
import { useParams, Link, useNavigate } from 'react-router-dom';
import articleService from '../services/articleService';
// import { AuthContext } from '../contexts/AuthContext'; // 假设有 AuthContext
//import DOMPurify from 'dompurify'; // 用于前端再次清理 (可选，主要依赖后端)

function ArticleDetailPage() {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const { user: currentUser } = useContext(AuthContext); // 从 Context 获取当前登录用户
  const currentUser = null; // 暂时模拟未登录或未实现 Context
  const { slug } = useParams(); // 从 URL 获取文章 slug
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await articleService.getArticleBySlug(slug);
        setArticle(data);
      } catch (err) {
        if (err.message === 'Article not found') {
            setError('找不到这篇文章。');
        } else {
            setError('加载文章失败，请稍后再试。');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug]); // 当 slug 变化时重新获取

  // --- 删除文章的处理函数 ---
  const handleDelete = async () => {
    if (!article || !currentUser || currentUser.id !== article.author_id) {
        alert('无权删除此文章');
        return;
    }
    if (window.confirm(`确定要删除文章 "${article.title}" 吗？`)) {
        try {
            // 调用删除 API (假设 article.id 存在)
            await articleService.deleteArticle(article.id);
            alert('文章删除成功！');
            navigate('/'); // 跳转回首页或其他列表页
        } catch (err) {
            console.error('删除文章失败:', err);
            alert('删除文章失败，请稍后再试。');
        }
    }
  };


  // --- 用于渲染清理后的 HTML ---
  const createMarkup = (htmlContent) => {
    // 前端清理作为额外保险层，但主要信任后端清理
    // 如果需要前端清理: const clean = DOMPurify.sanitize(htmlContent);
    // return { __html: clean };
    return { __html: htmlContent || '' }; // 确保有默认值
  };

  // --- 渲染逻辑 ---
  if (loading) return <div>加载中...</div>;
  if (error) return <div style={{ color: 'red' }}>错误: {error}</div>;
  if (!article) return <div>找不到文章。</div>; // 如果没出错但文章是 null

  // 判断当前用户是否是作者
  const isAuthor = currentUser && article && currentUser.id === article.author_id;

  return (
    <div className="article-detail">
      <h1>{article.title}</h1>
      <div className="article-meta">
        <span>作者: {article.author_username || '未知'}</span> |
        <span>国家: <Link to={`/articles/country/${article.country_slug}`}>{article.country_name || '未知'}</Link></span> |
        <span>发布于: {new Date(article.created_at).toLocaleString()}</span>
        {article.created_at !== article.updated_at && (
            <span> | 更新于: {new Date(article.updated_at).toLocaleString()}</span>
        )}
      </div>

      {article.cover_image_url && (
        <img src={article.cover_image_url} alt={article.title} style={{ maxWidth: '100%', height: 'auto', margin: '20px 0' }} />
      )}

      {/* 渲染文章内容 */}
      <div className="article-content" dangerouslySetInnerHTML={createMarkup(article.content)} />

      {/* 编辑和删除按钮 (仅作者可见) */}
      {isAuthor && (
        <div className="article-actions" style={{ marginTop: '20px' }}>
          <Link to={`/articles/${article.slug}/edit`} style={{ marginRight: '10px' }}>
            <button>编辑文章</button>
          </Link>
          <button onClick={handleDelete} style={{ backgroundColor: 'red', color: 'white' }}>删除文章</button>
        </div>
      )}
    </div>
  );
}

export default ArticleDetailPage;