// frontend/src/services/articleService.js
import api from './api';

const articleService = {
  createArticle: async (articleData) => {
    try {
      const response = await api.post('/articles', articleData);
      return response.data.article; // 返回创建的文章数据
    } catch (error) {
      console.error('Error creating article:', error.response?.data || error.message);
      throw error; // 重新抛出错误，让调用者处理
    }
  },
  // --- 创建文章草稿 ---
  createDraftArticle: async () => {
    try {
      // 调用 POST /api/articles/draft (需要登录)
      const response = await api.post('/articles/draft');
      return response.data; // 返回 { articleId: ... }
    } catch (error) {
      console.error('Error creating draft article:', error.response?.data || error.message);
      throw error;
    }
  },



  getArticleBySlug: async (slug) => {
    try {
      // 调用后端的 GET /api/articles/:slug 接口
      const response = await api.get(`/articles/${slug}`);
      return response.data; // 后端直接返回文章对象
    } catch (error) {
      console.error(`Error fetching article with slug ${slug}:`, error.response?.data || error.message);
      if (error.response && error.response.status === 404) {
          throw new Error('Article not found'); // 抛出特定错误方便处理
      }
      throw error; // 重新抛出其他错误
    }
  },

  // --- 更新文章 (用于保存草稿和发布) ---
  updateArticle: async (articleId, articleData) => {
    // articleData 包含 { title, content, country_slug, status }
    try {
      // 调用 PUT /api/articles/:id (需要登录)
      const response = await api.put(`/articles/${articleId}`, articleData);
      return response.data; // 返回 { message: ..., slug: ... }
    } catch (error) {
      console.error(`Error updating article ${articleId}:`, error.response?.data || error.message);
       // 将后端更具体的错误信息传递出去
      throw new Error(error.response?.data?.message || 'Failed to update article.');
    }
  },

  // --- 删除已上传的图片 ---
  deleteUploadedImage: async (imageId) => {
    try {
      // 调用 DELETE /api/upload/image/:imageId (需要登录)
      const response = await api.delete(`/upload/image/${imageId}`);
      return response.data; // 返回 { message: ... }
    } catch (error) {
      console.error(`Error deleting image ${imageId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // --- 删除文章 (如果还没实现) ---
  deleteArticle: async (id) => {
    try {
        const response = await api.delete(`/articles/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting article ${id}:`, error.response?.data || error.message);
        throw error;
    }
},

  getArticles: async (params = {}) => { // params 可以是 { page: 1, limit: 10, country: 'japan', featured: true }
     try {
       const response = await api.get('/articles', { params });
       return response.data; // 返回包含 articles 和 pagination 的对象
     } catch (error) {
       console.error('Error fetching articles:', error.response?.data || error.message);
       throw error;
     }
  },

  getCountries: async () => {
    try {
      const response = await api.get('/countries'); // 调用 GET /api/countries
      return response.data; // 后端返回国家对象数组 [{id, name, slug}, ...]
    } catch (error) {
      console.error('Error fetching countries:', error.response?.data || error.message);
      throw error;
    }
  },

// 示例：获取精选文章
getFeaturedArticles: async (limit = 5) => {
  try {
    const response = await api.get('/articles', { params: { featured: true, limit: limit } });
    return response.data; // 假设后端返回 { articles: [...], pagination: ... }
  } catch (error) {
    console.error('Error fetching featured articles:', error.response?.data || error.message);
    throw error;
  }
},

// 示例：获取最新文章
getLatestArticles: async (limit = 10) => {
   try {
     const response = await api.get('/articles', { params: { limit: limit, sortBy: 'createdAt_desc' } }); // 假设后端支持 sortBy
     return response.data;
   } catch (error) {
      console.error('Error fetching latest articles:', error.response?.data || error.message);
      throw error;
   }
},
getMyArticles: async () => {
  try {
    console.log('Fetching my articles...'); // Log before request
    const response = await api.get('/users/me/articles');
    console.log('Received my articles response:', response.data); // Log the received data
    // Ensure you are returning the correct part of the response
    // If backend returns { articles: [...] }, then return response.data
    // If backend returns just [...], then return response.data directly
    return response.data; // Assuming backend returns { articles: [...] }
  } catch (error) {
    console.error('Error fetching my articles:', error.response?.data || error.message);
    throw error;
  }
},

};

export default articleService;