// frontend/src/pages/ArticleDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import articleService from '../services/articleService';
import './ArticleDetailPage.css'; // 引入页面专属 CSS
import { useAuth } from '../contexts/AuthContext'; // <-- 添加这一行来导入 useAuth Hook

function ArticleDetailPage() {
  const [article, setArticle] = useState(null); // 包含文章信息和 images 数组
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const { user: currentUser } = useContext(AuthContext);
  //const currentUser = null; // 暂时模拟
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // <-- 使用 useAuth Hook 或 useContext(AuthContext) 获取用户

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await articleService.getArticleBySlug(slug);
        console.log("Fetched article data:", data); // 打印获取到的数据，确认 images 数组存在且有内容
        setArticle(data);
      } catch (err) {
        if (err.message === 'Article not found') {
            setError('Article not found or not published yet.');
        } else {
            setError('Failed to load the article. Please try again later.');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug]);// 当 slug 变化时重新获取

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

  // --- **在此处添加日志确认 currentUser 和 article.author_id** ---
  useEffect(() => {
    if (article && currentUser) {
        console.log("Current User ID:", currentUser.id, typeof currentUser.id);
        console.log("Article Author ID:", article.author_id, typeof article.author_id);
        console.log("Is Author Check:", currentUser.id === article.author_id);
    }
}, [article, currentUser]); // 当文章数据或当前用户信息加载后打印

// --- 渲染逻辑 ---
if (loading) return <div className="loading-message">Loading article...</div>;
if (error) return <div className="error-message">Error: {error}</div>;
if (!article) return <div className="not-found-message">Article not found.</div>;

const isAuthor = currentUser && article && currentUser.id === article.author_id;
console.log("Calculated isAuthor:", isAuthor); // 打印计算结果

return (
  <div className="article-detail-page">
    {/* 文章标题 */}
    <h1 className="article-title">{article.title}</h1>

    {/* 文章元数据 */}
    <div className="article-meta">
      <span>Author: {article.author_username || 'Unknown'}</span> |
      <span>Country: <Link to={`/articles/country/${article.country_slug}`}>{article.country_name || 'Unknown'}</Link></span> |
      <span>Type: {article.type === 'food' ? 'Food' : 'Travel'}</span> | {/* 显示类型 */}
      <span>Published: {new Date(article.created_at).toLocaleString()}</span>
      {article.created_at !== article.updated_at && (
          <span> | Updated: {new Date(article.updated_at).toLocaleString()}</span>
      )}
    </div>

    {/* 主图 (如果使用了 main_image_url 字段) */}
    {article.main_image_url && (
      <img src={article.main_image_url} alt={article.title} className="article-main-image" />
    )}

    {/* 文章文字内容 */}
    <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content || '' }} />

    {/* --- 图片展示区域 --- */}
    {/* 检查 article.images 是否存在且是一个包含元素的数组 */}
    {article.images && article.images.length > 0 && (
        <div className="article-images-section">
          <h3>Gallery ({article.images.length} images)</h3> {/* 在标题处显示总数 */}
          <div className="article-images-list">
            {/* 遍历 images 数组，按顺序显示图片 */}
            {article.images.map((image, index) => (
              // --- **给每个图片项添加相对定位** ---
              <div key={image.id || index} className="article-image-item">
                <img
                  src={image.image_url}
                  alt={`${article.title} - Gallery picture ${index + 1}`}
                  loading="lazy"
                />
                {/* --- **添加图片编号元素** --- */}
                <div className="image-number-overlay">
                  {index + 1} / {article.images.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    {/* 编辑和删除按钮 (仅作者可见) */}
    {isAuthor && (
      <div className="article-actions" style={{ marginTop: '20px' }}>
        <Link to={`/articles/${article.slug}/edit`} className="action-button edit-button">
          Edit Guide
        </Link>
        <button onClick={handleDelete} className="action-button delete-button">Delete Guide</button>
      </div>
    )}
  </div>
);
}

export default ArticleDetailPage;