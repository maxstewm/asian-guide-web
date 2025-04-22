// frontend/src/pages/MyGuidesPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import articleService from '../services/articleService'; // 假设需要调用 service
import { useAuth } from '../contexts/AuthContext'; // 获取登录状态

function MyGuidesPage() {
  const [myArticles, setMyArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoggedIn, isLoading: authLoading } = useAuth(); // 获取用户信息和登录状态

  // --- TODO: 实现获取用户文章的逻辑 ---
  useEffect(() => {
    // 暂时设置加载完成，避免一直显示加载中
    setLoading(false);
    console.log("useEffect running. AuthLoading:", authLoading, "IsLoggedIn:", isLoggedIn); // 检查 useEffect 触发状态
    // 实际逻辑会在这里调用 API
     if (!authLoading && isLoggedIn && user) {
      console.log("User logged in, fetching articles for user:", user.id); // 确认 user.id 可用
      fetchMyArticles(user.id);
       // fetchMyArticles(user.id); // 调用获取文章的函数
     } else if (!authLoading && !isLoggedIn) {
         console.log("User not logged in or auth still loading.");
         setError("Please log in first to view my guide."); // 或者重定向到登录页
         setLoading(false);
     }
  }, [isLoggedIn, user, authLoading]); // 依赖登录状态和用户信息

  console.log("Rendering MyGuidesPage, myArticles:", myArticles);

  const fetchMyArticles = async (userId) => {
     setLoading(true);
     setError(null);
     try {
         // *** 关键：调用哪个 API？***
         // 选项 A: 假设 articleService 有 getMyArticles 方法
         console.log("Calling articleService.getMyArticles for user:", userId); // 添加 userId 日志
          const data = await articleService.getMyArticles(); // 调用 service
          console.log("Data received in MyGuidesPage:", data); // 再次确认 data 的结构

         // *** 这里的逻辑最可疑 ***
           // 确保你使用的变量名是 data (或者你 await service 调用的结果)
           // 并且访问的是 data.articles
          if (data && data.articles) { // 检查 data 和 data.articles 是否存在
            setMyArticles(data.articles); // 使用 data.articles 更新状态
            console.log("myArticles state updated with:", data.articles); // 确认更新后的值
          } else {
            console.log("Received data does not contain 'articles' array:", data);
            setMyArticles([]); // 如果数据结构不对，设置为空数组
          }

     } catch (err) {
         setError("Could not load your guides.");
         console.error(err);
     } finally {
         setLoading(false);
     }
  };

  if (authLoading || loading) return <div>Loading...</div>; // 统一处理加载状态
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!isLoggedIn) return <div>Please log in first.</div>; // 如果检查后未登录

  return (
    <div>
      <h2>My Guides</h2>
      {myArticles.length === 0 ? (
        <p>You haven't published any guides yet. <Link to="/articles/new">Create the first one?</Link></p>
      ) : (
        <div className="article-list">
          {myArticles.map(article => (
          // --- TODO: Implement proper rendering for each article ---
          <div key={article.id} style={{ border: '1px solid #eee', marginBottom: '10px', padding: '10px' }}>
            <h3>
              <Link to={`/articles/${article.slug}`}>{article.title}</Link>
            </h3>
            <p>Country: {article.country_name}</p>
            <p>Created: {new Date(article.created_at).toLocaleDateString()}</p>
            {/* Add Edit/Delete buttons here */}
            <Link to={`/articles/${article.slug}/edit`} style={{ marginRight: '10px' }}>Edit</Link>
            <button onClick={() => handleDeleteArticle(article.id, article.title)}>Delete</button> {/* Add delete handler */}
          </div>
        ))}
      </div>
    )}
  </div>
);

}
// Add a basic delete handler placeholder
const handleDeleteArticle = (id, title) => {
  if(window.confirm(`Are you sure you want to delete "${title}"?`)) {
      console.log("TODO: Implement article deletion for ID:", id);
      // await articleService.deleteArticle(id);
      // // Refresh the list after deletion
      // if (user) fetchMyArticles(user.id);
  }
};

export default MyGuidesPage;