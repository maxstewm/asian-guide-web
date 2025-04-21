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
// ... 其他 require ...
const uploadRoutes = require('./routes/upload'); // 引入上传路由

// 引入路由文件
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles.js');
const userRoutes = require('./routes/users'); // 引入用户路由

dotenv.config(); // 加载环境变量
const app = express();

// --- 配置 CORS ---
// 允许来自你前端开发服务器源的请求
const corsOptions = {
  origin: 'http://35.198.219.2:3001', // 明确指定允许的前端源
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 允许的方法
  allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
  credentials: true, // 如果需要传递 cookie (JWT 通常不需要)
  optionsSuccessStatus: 204 // 让 OPTIONS 预检请求返回 204 No Content
};
app.use(cors(corsOptions)); // <-- 在路由之前使用 cors 中间件并传入配置

// 中间件
//app.use(cors()); // 允许跨域请求 (对于本地开发和分离的前后端很有用)
app.use(express.json());

// --- 挂载路由 ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', articleRoutes); // 注意: 像 /api/articles, /api/countries 会挂载在这里
app.use('/api/upload', uploadRoutes); // <-- 挂载上传路由

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