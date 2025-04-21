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
    // 实际逻辑会在这里调用 API
     if (!authLoading && isLoggedIn && user) {
       // fetchMyArticles(user.id); // 调用获取文章的函数
     } else if (!authLoading && !isLoggedIn) {
         setError("请先登录才能查看我的攻略。"); // 或者重定向到登录页
         setLoading(false);
     }
  }, [isLoggedIn, user, authLoading]); // 依赖登录状态和用户信息

  const fetchMyArticles = async (userId) => {
     setLoading(true);
     setError(null);
     try {
         // *** 关键：调用哪个 API？***
         // 选项 A: 假设 articleService 有 getMyArticles 方法
         // const data = await articleService.getMyArticles();

         // 选项 B: 假设 getArticles 支持按 authorId 过滤
         // const data = await articleService.getArticles({ authorId: userId });

         // 假设 data 是 { articles: [...] } 结构
         // setMyArticles(data.articles || []);

         // --- 暂时模拟数据 ---
         console.log("需要实现获取 '我的攻略' 的 API 调用");
         setMyArticles([]); // 暂时为空

     } catch (err) {
         setError("无法加载我的攻略列表。");
         console.error(err);
     } finally {
         setLoading(false);
     }
  };

  if (authLoading || loading) return <div>加载中...</div>; // 统一处理加载状态
  if (error) return <div style={{ color: 'red' }}>错误: {error}</div>;
  if (!isLoggedIn) return <div>请先登录。</div>; // 如果检查后未登录

  return (
    <div>
      <h2>我的攻略</h2>
      {myArticles.length === 0 ? (
        <p>你还没有发布任何攻略。 <Link to="/articles/new">去发布第一篇？</Link></p>
      ) : (
        <div className="article-list">
          {/* --- TODO: 渲染 myArticles 列表 --- */}
          {myArticles.map(article => (
            <div key={article.id}>
              <h3>{article.title}</h3>
              {/* 添加编辑和删除按钮 */}
              <Link to={`/articles/${article.slug}/edit`}>编辑</Link>
              <button>删除</button> {/* TODO: 实现删除逻辑 */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyGuidesPage;