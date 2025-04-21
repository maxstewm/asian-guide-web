// frontend/src/pages/ArticleListPage.js (示例)
import React, { useState, useEffect } from 'react';
import articleService from '../services/articleService';
import { Link, useParams } from 'react-router-dom'; // useParams 用于获取国家 slug

function ArticleListPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { countrySlug } = useParams(); // 从 URL 获取国家 slug

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchArticles = async () => {
      try {
        const params = {};
        if (countrySlug) {
          params.country = countrySlug;
        }
        // params.limit = 10; // 可以添加分页参数
        const data = await articleService.getArticles(params);
        setArticles(data.articles || []); // 确保是数组
      } catch (err) {
        setError('无法加载文章列表');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [countrySlug]); // 当 countrySlug 变化时重新获取数据

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h2>{countrySlug ? `国家: ${countrySlug}` : '所有攻略'}</h2>
      {articles.length === 0 ? (
        <p>暂无攻略</p>
      ) : (
        <div className="article-list">
          {articles.map(article => (
            <div key={article.id} className="article-card"> {/* 使用 ArticleCard 组件更佳 */}
              {/* 可以显示封面图 */}
              {article.cover_image_url && <img src={article.cover_image_url} alt={article.title} style={{maxWidth: '100px'}}/>}
              <h3>
                <Link to={`/articles/${article.slug}`}>{article.title}</Link>
              </h3>
              <p>作者: {article.author_username}</p>
              <p>国家: {article.country_name}</p>
              <p>发布于: {new Date(article.created_at).toLocaleDateString()}</p>
              {/* 可以显示摘要 */}
            </div>
          ))}
        </div>
      )}
      {/* 在这里添加分页控件 */}
    </div>
  );
}

export default ArticleListPage;