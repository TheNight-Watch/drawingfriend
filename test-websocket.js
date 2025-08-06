// 使用Bun原生WebSocket测试连接
console.log('🧪 开始测试WebSocket连接...');

const ws = new WebSocket('ws://localhost:8082?sessionId=test&model=step-1o-audio');

ws.onopen = function() {
  console.log('✅ WebSocket连接成功建立');
  
  // 发送会话初始化消息
  const sessionUpdate = {
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: '你是一个友善的AI助手，正在和儿童对话',
      voice: 'linjiajiejie'
    }
  };
  
  console.log('📤 发送会话初始化消息...');
  ws.send(JSON.stringify(sessionUpdate));
};

ws.onmessage = function(event) {
  console.log('📨 收到消息:', event.data);
  
  // 收到第一条消息后关闭连接
  setTimeout(() => {
    console.log('🔌 主动关闭连接');
    ws.close();
  }, 2000);
};

ws.onclose = function() {
  console.log('🛑 WebSocket连接已关闭');
  process.exit(0);
};

ws.onerror = function(error) {
  console.error('❌ WebSocket错误:', error);
  process.exit(1);
};

// 10秒超时
setTimeout(() => {
  console.log('⏰ 测试超时');
  ws.close();
  process.exit(1);
}, 10000); 