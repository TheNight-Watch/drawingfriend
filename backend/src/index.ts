import { startWebSocketServer } from './websocket/server';
import { startAPIServer } from './api/server';

console.log('🚀 启动儿童AI故事绘画后端服务...');

// 启动WebSocket中转服务器 (端口8082)
const wsServer = startWebSocketServer();

// 启动REST API服务器 (端口3000) 
const apiServer = startAPIServer();

console.log('✅ 所有服务已启动');
console.log('📡 WebSocket服务: ws://localhost:8082');
console.log('🌐 REST API服务: http://localhost:3000');
console.log('📁 静态文件: http://localhost:3000/uploads/');

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  wsServer.stop();
  apiServer.stop();
  process.exit(0);
}); 