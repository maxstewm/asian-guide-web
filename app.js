/*// app.js
const express = require('express');
const dotenv = require('dotenv');
//const authRoutes = require('./routes/auth');

//加载 .env 文件中的环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 路由
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// 启动服务
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
*/

// app.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // 考虑添加 CORS
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles'); // 添加 article 路由

dotenv.config();
const app = express();

// 中间件
app.use(cors()); // 允许跨域请求 (对于本地开发和分离的前后端很有用)
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes); // 认证路由
app.use('/api', articleRoutes);    // 文章路由 (包含创建及后续的读改删)

// 简单的根路径或 API 文档入口 (可选)
app.get('/', (req, res) => {
  res.send('Travel Asia API is running!');
});

// 导出 app 实例，而不是启动服务器
module.exports = app;