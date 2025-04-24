// frontend/src/pages/ArticleListPage.js (或 HomePage.js)
import React, { useState, useEffect } from 'react';
import articleService from '../services/articleService';
import { Link, useParams } from 'react-router-dom';
import ArticleCard from '../components/article/ArticleCard'; // <-- 引入卡片组件
import './ArticleListPage.css'; // <-- 引入列表页的 CSS (用于网格布局)

function ArticleListPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { countrySlug } = useParams(); // 用于按国家过滤

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchArticles = async () => {
      try {
        const params = { status: 'published' }; // 确保只获取 published
        if (countrySlug) { params.country = countrySlug; }
        // params.limit = 9; // 例如每页 9 个
        // params.page = 1;
        // if (isHomePage) { params.featured = true; params.limit = 6; } // 首页逻辑

        const data = await articleService.getArticles(params); // 调用 service
        setArticles(data.articles || []);
      } catch (err) {
        setError('Could not load guides.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [countrySlug]); // 依赖 countrySlug

  if (loading) return <div>Loading guides...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>{countrySlug ? `Guides for ${countrySlug}` : 'All Guides'}</h2>
      {articles.length === 0 ? (
        <p>No guides found for this selection.</p>
      ) : (
        // --- 使用网格布局来排列卡片 ---
        <div className="article-grid">
          {articles.map(article => (
            // 传递整个 article 对象给 ArticleCard
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
      {/* --- 在这里添加分页控件 --- */}
    </div>
  );
}

export default ArticleListPage;