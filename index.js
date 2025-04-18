/*const express = require('express');
const app = express();
const port = 3000;

const pool = require('./db');
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');

app.use(express.json()); // 接收 JSON 格式的 body
app.use('/api/auth', authRoutes); // 掛載註冊接口
app.use('/api', articleRoutes);


app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
*/

// index.js
const app = require('./app'); // 导入配置好的 app 实例
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});