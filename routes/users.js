// routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入数据库连接池
const authenticateToken = require('../middleware/auth'); // 引入认证中间件

// GET /api/users/me - 获取当前登录用户的信息
// 应用认证中间件，确保只有携带有效 JWT 的用户才能访问
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // authenticateToken 中间件会将解码后的用户信息附加到 req.user
    // req.user 中应该包含 { id: user.id, username: user.username } (根据你 jwt.sign 的 payload)
    const userId = req.user.id;

    // 从数据库查询更详细的用户信息（排除密码）
    const userResult = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      // 这种情况理论上不应该发生，因为 JWT 验证通过了
      // 但以防万一数据库中找不到用户（例如用户被删除了）
      return res.status(404).json({ message: '用户未找到' });
    }

    const userInfo = userResult.rows[0];
    res.json(userInfo);

  } catch (err) {
    console.error("获取用户信息失败:", err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;