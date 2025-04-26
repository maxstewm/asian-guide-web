// frontend/src/pages/ArticleListPage.js
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom'; // useParams 用于获取国家 slug
import articleService from '../services/articleService';
import ArticleCard from '../components/article/ArticleCard';
import './ArticleListPage.css'; // 引入列表页 CSS

// 国家列表 (与 HomePage 保持一致)
const asianCountries = [
  { name: 'China', slug: 'china' },
  { name: 'Japan', slug: 'japan' },
  { name: 'South Korea', slug: 'korea' },
  { name: 'Singapore', slug: 'singapore' },
  { name: 'Thailand', slug: 'thailand' },
  { name: 'Vietnam', slug: 'vietnam' },
];

function ArticleListPage() {
  const [articles, setArticles] = useState([]);
  const [pagination, setPagination] = useState({}); // 存储分页信息
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { countrySlug } = useParams(); // 从 URL 获取国家 slug (可能是 undefined)
  const [currentPage, setCurrentPage] = useState(1); // 当前页码状态

  // 当前选中的国家对象
  const selectedCountry = asianCountries.find(c => c.slug === countrySlug);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchArticles = async () => {
      try {
        const params = {
            status: 'published',
            page: currentPage, // 使用当前页码
            limit: 10 // 例如每页 9 篇
        };
        if (countrySlug) {
          params.country = countrySlug; // 如果有国家 slug，添加到参数
        }
        // params.featured = false; // 列表页通常不只显示精选

        const data = await articleService.getArticles(params); // 调用 service
        setArticles(data.articles || []);
        setPagination(data.pagination || {}); // 保存分页信息
      } catch (err) {
        setError('Could not load guides.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [countrySlug, currentPage]); // 依赖国家 slug 和当前页码

  // --- 处理分页变化的函数 ---
  const handlePageChange = (newPage) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
          setCurrentPage(newPage);
          // 可以选择滚动到页面顶部
          // window.scrollTo(0, 0);
      }
  };

  return (
    <div className="article-list-page"> {/* 可以给页面加个 class */}
      {/* --- 国家导航区域 (替换之前的标题) --- */}
      <nav className="country-nav-listpage"> {/* 使用不同的类名方便独立设置样式 */}
         {/* 添加一个 "All" 链接 */}
         <Link
            to="/articles"
            className={`country-link-listpage ${!countrySlug ? 'active' : ''}`}
          >
            All Countries
          </Link>
        {asianCountries.map(country => (
          <Link
            key={country.slug}
            to={`/articles/country/${country.slug}`}
            // 如果当前 URL 的 countrySlug 匹配，添加 active 类
            className={`country-link-listpage ${countrySlug === country.slug ? 'active' : ''}`}
          >
            {country.name}
          </Link>
        ))}
      </nav>

      {/* --- 显示当前筛选条件或标题 --- */}
      <h2 className="list-page-title">
          {selectedCountry ? `Guides for ${selectedCountry.name}` : 'All Guides'}
      </h2>

      {loading && <div>Loading guides...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}

      {!loading && !error && articles.length === 0 && (
        <p>No guides found for this selection.</p>
      )}

      {!loading && !error && articles.length > 0 && (
        <>
       {/*  // --- 使用网格布局来排列卡片 ---*/}
        <div className="article-columns">
          {articles.map(article => (
            // 传递整个 article 对象给 ArticleCard
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      {/* --- 分页控件 --- */}
      <div className="pagination-controls">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    Previous
                </button>
                <span> Page {pagination.currentPage} of {pagination.totalPages} </span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= pagination.totalPages}
                >
                    Next
                </button>
            </div>
        </>
      )}
    </div>
  );
}

export default ArticleListPage;