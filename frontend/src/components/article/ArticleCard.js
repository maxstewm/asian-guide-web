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
  console.log("Article data received in Card:", article); // <-- 打印传入的数据
  if (!article) return null; // 如果文章数据无效，不渲染

  // 确定要显示的图片 URL
  // 优先使用 main_image_url，其次使用 images 数组的第一张图
  const imageUrl = article.main_image_url || (article.images && article.images.length > 0 ? article.images[0].image_url : null);
  console.log("Determined imageUrl:", imageUrl); // <-- 打印最终使用的 URL
  
  // 确定要显示的日期 (更新日期优先)
  const displayDate = new Date(article.updated_at || article.created_at);
  const dateString = displayDate.toLocaleDateString(); // 或者使用更友好的格式化库

  return (
    // 使用 article-card 作为根元素的 class
    <div className="article-card">
      <Link to={`/articles/${article.slug}`} className="card-link">
        {/* 图片区域 */}
        <div className="card-image-container">
          {imageUrl ? (
            // 图片添加圆角需要在这里处理，或者通过父容器的 overflow:hidden
            <img src={imageUrl} alt={article.title || 'Article image'} className="card-image" loading="lazy" />
          ) : (
            <div className="card-excerpt">
              {getExcerpt(article.content, 120)}
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="card-content">
          {/* 标题需要应用特定样式来限制行数 */}
          <h3 className="card-title">{article.title || 'Untitled Article'}</h3>
          {/* 作者和日期行 */}
          <div className="card-meta">
            {/* 作者部分需要应用样式限制行数 */}
            <span className="card-author">By: {article.author_username || 'Unknown'}</span>
            <span className="card-date">{dateString}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}


export default ArticleCard;