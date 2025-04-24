// frontend/src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 如果需要链接
import articleService from '../services/articleService';
import ArticleCard from '../components/article/ArticleCard'; // <-- 引入卡片组件
import './HomePage.css'; // <-- 引入首页专属 CSS (可选，或复用 ArticleListPage.css)

function HomePage() {
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchFeaturedArticles = async () => {
      try {
        // 调用 API 获取精选文章，限制数量
        const params = {
          featured: true,
          limit: 6 // 例如，最多显示 6 篇精选文章
          // 可以添加 status: 'published' 确保只获取已发布的
        };
        const data = await articleService.getArticles(params); // 调用 service
        setFeaturedArticles(data.articles || []); // 获取文章数组
      } catch (err) {
        setError('Could not load featured guides.');
        console.error("Fetch featured articles error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedArticles();
  }, []); // 空依赖数组，表示只在组件挂载时获取一次

  return (
    <div className="home-page">
      <section className="hero-section"> {/* 可以添加一个醒目的头部区域 */}
        <h1>Discover Amazing Asia</h1>
        <p>Your ultimate guide to travel and food across the continent.</p>
        {/* 可以放一个搜索框或主要分类链接 */}
      </section>

      <section className="featured-articles-section">
        <h2>Featured Guides</h2>

        {loading && <div>Loading featured guides...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}

        {!loading && !error && featuredArticles.length === 0 && (
          <p>No featured guides available at the moment.</p>
        )}

        {!loading && !error && featuredArticles.length > 0 && (
          // --- 使用与列表页相同的网格布局类名 ---
          <div className="article-grid">
            {featuredArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {!loading && ( /* 只有加载完成后才显示查看更多按钮 */
          <div className="view-all-link">
            <Link to="/articles">View All Guides</Link>
          </div>
        )}
      </section>

      {/* 可以在这里添加其他首页内容，例如按国家分类的入口等 */}
      {/* <section className="country-links-section"> ... </section> */}

    </div>
  );
}

export default HomePage;