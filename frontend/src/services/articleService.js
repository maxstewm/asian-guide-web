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

  updateArticle: async (id, articleData) => {
     // ... 更新文章的 API 调用 ...
  },

  deleteArticle: async (id) => {
     // ... 删除文章的 API 调用 ...
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