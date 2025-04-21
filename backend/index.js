// index.js
const app = require('./app'); // <-- 导入配置好的 app 实例
const http = require('http'); // Node.js 内置的 http 模块

// 从环境变量获取端口，或使用默认值
const port = process.env.PORT || 3000;
app.set('port', port); // 将端口设置到 app 上 (可选，但有时有用)

// 创建 HTTP 服务器
const server = http.createServer(app);

// 监听端口
server.listen(port);

// 服务器事件监听 (可选，增强健壮性)
server.on('error', onError);
server.on('listening', onListening);

/**
 * HTTP 服务器 "error" 事件监听器。
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // 处理特定的监听错误
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * HTTP 服务器 "listening" 事件监听器。
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on ' + bind);
  // 可以替换掉 app.js 中的 console.log
}