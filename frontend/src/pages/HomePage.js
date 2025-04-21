// frontend/src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import articleService from '../services/articleService';
import { Link } from 'react-router-dom';
// import ArticleCard from '../components/article/ArticleCard'; // 假设有这个组件

function HomePage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // 获取精选文章或最新文章
    articleService.getFeaturedArticles(6) // 获取 6 篇精选文章
      .then(data => {
        setArticles(data.articles || []);
      })
      .catch(err => {
        setError('Failed to load articles.');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // 空依赖数组，只在加载时获取一次

  if (loading) return <div>Loading featured articles...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Welcome to Asian Guides!</h1>
      <p>Discover amazing travel and food guides from across Asia.</p>
      <h2>Featured Guides</h2>
      {articles.length === 0 ? (
        <p>No featured guides available right now.</p>
      ) : (
        <div className="article-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {articles.map(article => (
            // --- 使用 ArticleCard 组件会更好 ---
            <div key={article.id} className="article-card" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
              {article.cover_image_url && <img src={article.cover_image_url} alt={article.title} style={{ width: '100%', height: '150px', objectFit: 'cover', marginBottom: '10px' }}/>}
              <h3>
                <Link to={`/articles/${article.slug}`}>{article.title}</Link>
              </h3>
              <p style={{ fontSize: '0.9em', color: '#666' }}>By {article.author_username} in {article.country_name}</p>
              {/* 可以显示摘要或日期 */}
            </div>
            // <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;