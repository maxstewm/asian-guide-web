// 导入所需模块
const express = require('express'); // Express框架
const bcrypt = require('bcryptjs');   // 密码哈希加密库
const jwt = require('jsonwebtoken'); // JWT令牌生成库
const pool = require('../db');      // 数据库连接池

// 创建Express路由实例
const router = express.Router();

/**
 * 用户注册接口
 * POST /api/auth/register
 * 请求体: { username, email, password }
 * {
  "username": "your_desired_username", // String, 必需, 唯一性由数据库保证
  "email": "user@example.com",        // String, 必需, 唯一性由数据库保证, 有效邮箱格式
  "password": "your_strong_password"  // String, 必需, 最小长度建议 (例如 6 位)
  }
 * 响应:
 *成功：{
  "message": "User registered successfully!",
  "user": {
    "id": 123, // Number, 新创建用户的 ID
    "username": "your_desired_username",
    "email": "user@example.com",
    "created_at": "2025-04-25T10:30:00.000Z"
  }
}
 * 失败响应:
 * 400 Bad Request: 缺少必要字段、邮箱格式错误、密码过短、用户名/邮箱已存在。
 * 500 Internal Server Error: 数据库插入失败等。
 **/
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // 检查用户名或邮箱是否已存在
    const userExists = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    // 如果用户已存在，返回400错误
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }

    // 使用bcrypt对密码进行哈希加密（10是salt rounds）
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 将新用户插入数据库
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );

    // 返回201创建成功响应
    res.status(201).json({ 
      message: '注册成功', 
      user: newUser.rows[0] // 返回新创建的用户信息（不含密码）
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * 用户登录接口
 * POST /api/auth/login
 * 请求体: { email, password }
 * {
 * "email": "user@example.com",
 * "password": "your_password"
 * }
 * 成功：
 * {
 * "message": "Login successful!",
 * "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJ1c2VybmFtZSI6InlvdXJfdXNlcm5hbWUiLCJpYXQiOjE3MTM5OTc4MDAsImV4cCI6MTcxNDYwMjYwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" // String, JWT 认证令牌
 * }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 查询数据库获取用户信息
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // 用户不存在检查
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }

    // 验证密码是否匹配
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '密码错误' });
    }

    // 生成JWT令牌（有效期为7天）
    const token = jwt.sign(
      { id: user.id, username: user.username }, // 令牌负载
      process.env.JWT_SECRET || JWT_SECRET,     // 使用环境变量中的密钥
      { expiresIn: '7d' }                      // 过期时间
    );

    // 返回令牌
    res.json({ token });
    
  } catch (err) {
    console.error('登录失败：', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导出路由
module.exports = router;
