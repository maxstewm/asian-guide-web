// backend/routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth'); // 确保路径正确

// --- 获取当前用户信息 (GET /api/users/me) ---
// (之前的代码)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userResult = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' }); // 英文
    }
    res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Failed to fetch user info:", err); // 英文
    res.status(500).json({ message: 'Server error' });
  }
});

// --- 获取当前登录用户发布的文章 (GET /api/users/me/articles) ---
router.get('/me/articles', authenticateToken, async (req, res) => {
    const userId = req.user.id; // 从认证中间件获取用户 ID
    const { page = 1, limit = 10 } = req.query; // 获取分页参数

    // 参数验证和转换
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ message: 'Page number must be a positive integer' });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        return res.status(400).json({ message: 'Limit must be between 1 and 50' });
    }
    const offset = (pageNum - 1) * limitNum;

    try {
        // 查询当前用户的文章列表 (连接国家表获取国家名称)
        const articlesQuery = `
            SELECT
                a.id, a.title, a.slug, a.cover_image_url, a.created_at, a.updated_at,
                c.name AS country_name, c.slug AS country_slug
            FROM articles a
            JOIN countries c ON a.country_id = c.id
            WHERE a.user_id = $1
            ORDER BY a.created_at DESC
            LIMIT $2 OFFSET $3;
        `;
        // 查询该用户的文章总数
        const countQuery = 'SELECT COUNT(*) FROM articles WHERE user_id = $1';

        // 并行执行两个查询
        const [articlesResult, countResult] = await Promise.all([
            pool.query(articlesQuery, [userId, limitNum, offset]),
            pool.query(countQuery, [userId])
        ]);

        const totalArticles = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalArticles / limitNum);

        // 返回结果，包含文章列表和分页信息
        res.json({
            articles: articlesResult.rows,
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalArticles: totalArticles,
                limit: limitNum
            }
        });
      } catch (err) {
        console.error("Failed to fetch user articles:", err); // 英文
        res.status(500).json({ message: 'Server error, failed to fetch articles.' }); // 英文
    }
});


// --- 可能还有其他用户相关的路由，例如更新用户信息 PUT /api/users/me ---

module.exports = router;