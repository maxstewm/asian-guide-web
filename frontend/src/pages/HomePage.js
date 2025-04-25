// frontend/src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import articleService from '../services/articleService';
import ArticleCard from '../components/article/ArticleCard';
import './HomePage.css'; // 引入首页专属 CSS
import './ArticleListPage.css'; // 复用列表页的网格布局 CSS (如果样式相同)

// 假设的国家列表 (理想情况下也从 API 获取，或者作为常量)
const asianCountries = [
  { name: 'China', slug: 'china' }, // 假设 slug 是 'china'
  { name: 'Japan', slug: 'japan' },
  { name: 'South Korea', slug: 'south-korea' },
  { name: 'Singapore', slug: 'singapore' },
  { name: 'Thailand', slug: 'thailand' },
  { name: 'Vietnam', slug: 'vietnam' },
];

function HomePage() {
  const [latestArticles, setLatestArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchLatestArticles = async () => {
      try {
        // 获取最新的 10 篇已发布的文章
        const params = {
          limit: 10,
          sortBy: 'created_at', // 按创建时间排序
          order: 'desc',       // 最新的在前
          status: 'published' // 确保只获取已发布的
        };
        const data = await articleService.getArticles(params);
        setLatestArticles(data.articles || []);
      } catch (err) {
        setError('Could not load latest guides.');
        console.error("Fetch latest articles error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestArticles();
  }, []); // 只在挂载时获取一次

  return (
    <div className="home-page">
      {/* 1. Hero Section (保持不变或修改) */}
      <section className="hero-section">
        <h1>Discover Amazing Asia</h1>
        <p>Your ultimate guide to travel and food across the continent.</p>
      </section>

      {/* 2. 新增：国家导航/频道页 */}
      <section className="country-channel-section">
        <h2>Explore Your Journey</h2> {/* 频道标题 */}
        <nav className="country-nav">
          {asianCountries.map(country => (
            // 点击国家链接，跳转到对应列表页
            <Link key={country.slug} to={`/articles/country/${country.slug}`} className="country-link">
              {country.name}
            </Link>
          ))}
        </nav>
      </section>

      {/* 3. 最新文章列表 */}
      <section className="latest-articles-section">
        <h2>Latest Guides</h2> {/* 列表标题 */}

        {loading && <div>Loading latest guides...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}

        {!loading && !error && latestArticles.length === 0 && (
          <p>No guides published yet.</p>
        )}

        {!loading && !error && latestArticles.length > 0 && (
          // 使用文章网格布局
          <div className="article-grid">
            {latestArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* 可以保留或移除“查看全部”按钮 */}
        {!loading && (
          <div className="view-all-link">
            <Link to="/articles">View All Guides</Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;