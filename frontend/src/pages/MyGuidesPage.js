// frontend/src/pages/MyGuidesPage.js
import React, { useState, useEffect, useCallback } from 'react'; // 引入 useCallback
import { Link } from 'react-router-dom';
import articleService from '../services/articleService';
import { useAuth } from '../contexts/AuthContext';

function MyGuidesPage() {
  const [myArticles, setMyArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();

  // --- 使用 useCallback 包裹 fetchMyArticles ---
  // 它依赖 user.id 来决定是否获取，但函数本身不依赖 user 对象引用
  const fetchMyArticles = useCallback(async () => {
     // 从 context 获取最新的 user 信息
     const currentUserId = user?.id;
     if (!currentUserId) {
         console.log("fetchMyArticles called but user ID is not available.");
         setMyArticles([]); // 确保用户 ID 无效时列表为空
         setLoading(false); // 结束加载状态
         return;
     }

     console.log("Calling articleService.getMyArticles for user:", currentUserId);
     setLoading(true); // 开始加载
     setError(null);   // 清除旧错误
     try {
         const data = await articleService.getMyArticles(); // Service 调用
         console.log("Data received in MyGuidesPage:", data);
         if (data && data.articles) {
             setMyArticles(data.articles);
             console.log("myArticles state updated with:", data.articles);
         } else {
             console.log("Received data does not contain 'articles' array:", data);
             setMyArticles([]);
         }
     } catch (err) {
         setError("Could not load your guides.");
         console.error("Fetch articles error:", err); // 打印详细错误
         setMyArticles([]);
     } finally {
         setLoading(false); // 结束加载
     }
  }, [user?.id]); // <-- useCallback 依赖 user.id，当 ID 变化时函数会重新创建 (虽然通常 ID 不变)

  // --- useEffect 加载初始数据 ---
  useEffect(() => {
    console.log("MyGuidesPage useEffect triggered. AuthLoading:", authLoading, "IsLoggedIn:", isLoggedIn, "User ID:", user?.id);
    if (!authLoading && isLoggedIn && user?.id) {
      fetchMyArticles(); // 调用 useCallback 包装后的函数
    } else if (!authLoading && !isLoggedIn) {
        setLoading(false); // 未登录，结束加载
        setMyArticles([]); // 清空列表
        // setError("Please log in first to view my guides."); // 可以在渲染部分处理未登录提示
    }
    // 如果 authLoading 为 true，保持 loading 状态，等待认证完成
  }, [isLoggedIn, user?.id, authLoading, fetchMyArticles]); // <-- 依赖项包含 fetchMyArticles (稳定引用) 和 user.id

  // --- 删除处理函数 (移入组件内部) ---
  const handleDeleteArticle = async (id, title) => {
      if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
          console.log("Attempting to delete article ID:", id);
          // 可以添加一个临时的删除中状态，例如禁用按钮
          // setLoading(true); // 或者用一个专门的 isDeleting 状态
          setError(null);
          try {
              await articleService.deleteArticle(id); // <-- 调用后端删除 API
              alert('Article deleted successfully!');
              // 删除成功后，调用 fetchMyArticles 刷新列表
              fetchMyArticles(); // 重新加载列表
          } catch (err) {
              console.error("Failed to delete article:", err);
              setError('Failed to delete the article. Please try again.');
              // setLoading(false); // 如果用了 loading 状态，失败时也要结束
          }
      }
  };

  console.log("Rendering MyGuidesPage, myArticles:", myArticles);

  // --- 渲染逻辑 ---
  // 先处理顶层的加载和认证状态
  if (authLoading) return <div>Loading authentication status...</div>;
  if (!isLoggedIn) return <div>Please log in first to view your guides. <Link to="/login">Login here</Link></div>;
  // 再处理文章列表的加载和错误状态
  if (loading) return <div>Loading your guides...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;


  return (
    <div>
      <h2>My Guides</h2>
      {myArticles.length === 0 ? (
        <p>You haven't published any guides yet. <Link to="/articles/new">Create the first one?</Link></p>
      ) : (
        <div className="article-list">
          {myArticles.map(article => (
            <div key={article.id} style={styles.articleCard}>
              <h3>
                <Link to={`/articles/${article.slug}`}>{article.title}</Link>
              </h3>
              <p>Country: {article.country_name}</p>
              <p>Status: {article.status || 'published'}</p> {/* 显示状态 */}
              <p>Last Updated: {new Date(article.updated_at).toLocaleString()}</p>
              <div style={styles.actions}>
                 <Link to={`/articles/${article.slug}/edit`} style={styles.editButton}>Edit</Link>
                 {/* 将 handleDeleteArticle 绑定到 onClick */}
                 <button onClick={() => handleDeleteArticle(article.id, article.title)} style={styles.deleteButton}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- 样式对象 (移入组件内部或保持外部，这里移入方便) ---
const styles = {
    articleCard: {
        border: '1px solid #eee',
        marginBottom: '15px',
        padding: '15px',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9'
    },
    actions: {
        marginTop: '10px',
        textAlign: 'right'
    },
    editButton: {
        marginRight: '10px',
        padding: '5px 10px',
        backgroundColor: '#007bff',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '3px',
        border: 'none', // 添加这个，让它看起来更像按钮
        cursor: 'pointer' // 添加鼠标手势
    },
    deleteButton: {
        padding: '5px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
    }
};


export default MyGuidesPage;