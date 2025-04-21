const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: '缺少授权头 Authorization' });
  }

  const token = authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token 不存在' });
  }

  try {
    const secretKey = process.env.JWT_SECRET || 'your_jwt_secret'; // 使用环境变量更安全
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded; // 把用户信息挂在 req 上
    next();
  } catch (err) {
    console.error('Token 验证失败:', err);
    res.status(403).json({ error: '无效的 Token' });
  }
};

module.exports = verifyToken;
