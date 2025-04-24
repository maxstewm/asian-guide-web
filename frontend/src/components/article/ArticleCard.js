// frontend/src/components/article/ArticleCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './ArticleCard.css'; // 引入卡片样式

// 函数：获取文章摘要 (截取前 N 个字符)
const getExcerpt = (content, maxLength = 100) => {
  if (!content) return '';
  // 移除 HTML 标签 (简单方式，可能不完美)
  const textContent = content.replace(/<[^>]*>?/gm, '');
  if (textContent.length <= maxLength) {
    return textContent;
  }
  return textContent.substring(0, maxLength) + '...';
};

function ArticleCard({ article }) {
  if (!article) return null; // 如果文章数据无效，不渲染

  // 确定要显示的图片 URL
  // 优先使用 main_image_url，其次使用 images 数组的第一张图
  const imageUrl = article.main_image_url || (article.images && article.images.length > 0 ? article.images[0].image_url : null);

  // 确定要显示的日期 (更新日期优先)
  const displayDate = new Date(article.updated_at || article.created_at);
  const dateString = displayDate.toLocaleDateString(); // 或者使用更友好的格式化库

  return (
    <div className="article-card">
      {/* 使用 Link 包裹整个卡片或图片/标题，使其可点击 */}
      <Link to={`/articles/${article.slug}`} className="card-link">
        {/* 图片区域 */}
        <div className="card-image-container">
          {imageUrl ? (
            <img src={imageUrl} alt={article.title} className="card-image" loading="lazy" />
          ) : (
            // 如果没有图片，显示文字摘要
            <div className="card-excerpt">
              {getExcerpt(article.content, 120)} {/* 调整摘要长度 */}
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="card-content">
          <h3 className="card-title">{article.title}</h3>
          <div className="card-meta">
            <span className="card-author">By: {article.author_username || 'Unknown'}</span>
            <span className="card-date">{dateString}</span>
          </div>
          {/* 可以选择性地显示国家或类型 */}
          {/* <div className="card-tags">
             {article.country_name && <span className="tag country-tag">{article.country_name}</span>}
             {article.type && <span className="tag type-tag">{article.type}</span>}
          </div> */}
        </div>
      </Link>
    </div>
  );
}

export default ArticleCard;