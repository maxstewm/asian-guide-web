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
const cors = require('cors'); // 假设你需要处理跨域

// 引入路由文件
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const userRoutes = require('./routes/users');

dotenv.config(); // 加载环境变量
const app = express();

// 中间件
app.use(cors()); // 允许跨域请求 (对于本地开发和分离的前后端很有用)
app.use(express.json());

// --- 挂载路由 ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', articleRoutes); // 注意: 像 /api/articles, /api/countries 会挂载在这里

// 简单的根路径或 API 文档入口 (可选)
app.get('/', (req, res) => {
  res.send('Travel Asia API is running!');
});

// --- 404 错误处理 (可选) ---
app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that!");
});

// --- 全局错误处理中间件 (必须放在路由之后) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 导出 app 实例，供 index.js 使用
// 导出 app 实例，而不是启动服务器
module.exports = app;