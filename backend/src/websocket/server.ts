import { env } from 'bun';

const STEPFUN_WS_URL = 'wss://api.stepfun.com/v1/realtime';
const DEFAULT_MODEL = 'step-1o-audio';
const API_KEY = env.STEPFUN_API_KEY;

if (!API_KEY) {
  console.error('❌ STEPFUN_API_KEY environment variable is required');
  process.exit(1);
}

export function startWebSocketServer() {
  const server = Bun.serve({
    port: 8082,
    fetch(req, server) {
      // 处理WebSocket升级请求
      const success = server.upgrade(req, {
        data: { requestUrl: req.url }
      });

      if (success) {
        return; // WebSocket升级成功
      }
      return new Response('WebSocket upgrade failed', { status: 500 });
    },
    websocket: {
      open(ws: any) {
        console.log('🔗 客户端连接到WebSocket中转服务器');

        // 初始化ws.data
        ws.data = ws.data || {};

        // 解析请求URL参数
        const requestUrl = ws.data.requestUrl || '';
        let clientModel = DEFAULT_MODEL;
        
        try {
          if (requestUrl) {
            const url = new URL(requestUrl);
            clientModel = url.searchParams.get('model') || DEFAULT_MODEL;
          }
        } catch (e) {
          console.error('URL解析失败:', e);
        }

        // 构建阶跃星辰WebSocket URL
        const stepfunWsUrl = `${STEPFUN_WS_URL}?model=${clientModel}`;
        console.log(`🚀 连接到阶跃星辰API: ${stepfunWsUrl}`);

        // 创建到阶跃星辰的WebSocket连接
        const stepfunWs = new WebSocket(stepfunWsUrl, {
          headers: {
            Authorization: `Bearer ${API_KEY}`
          }
        } as any);

        // 存储连接引用
        ws.data.stepfunWs = stepfunWs;
        ws.data.messageQueue = [];

        // 设置阶跃星辰WebSocket事件处理
        stepfunWs.onopen = () => {
          console.log('✅ 已连接到阶跃星辰API');
          
          // 发送队列中的消息
          if (ws.data.messageQueue.length > 0) {
            console.log(`📤 发送${ws.data.messageQueue.length}条排队消息`);
            ws.data.messageQueue.forEach((msg: any) => {
              stepfunWs.send(msg);
            });
            ws.data.messageQueue = [];
          }
        };

        stepfunWs.onmessage = (event) => {
          // 直接转发阶跃星辰的响应给客户端
          if (event.data instanceof Buffer) {
            ws.send(event.data.toString());
          } else {
            ws.send(event.data);
          }
        };

        stepfunWs.onclose = (event) => {
          console.log('❌ 阶跃星辰API连接关闭');
          ws.close();
        };

        stepfunWs.onerror = (error) => {
          console.error('❌ 阶跃星辰API连接错误:', error);
          
          // 发送错误消息给客户端
          const errorMessage = {
            type: 'error',
            error: 'stepfun_connection_error',
            message: '连接阶跃星辰API失败'
          };
          
          try {
            ws.send(JSON.stringify(errorMessage));
          } catch (e) {
            console.error('发送错误消息失败:', e);
          }
        };
      },

      message(ws: any, message: string | Buffer) {
        if (!ws.data?.stepfunWs) {
          console.error('❌ 阶跃星辰WebSocket连接不存在');
          return;
        }

        const stepfunWs = ws.data.stepfunWs;
        
        if (stepfunWs.readyState !== WebSocket.OPEN) {
          // 如果连接还没开启，加入队列
          console.log('⏳ 阶跃星辰连接未就绪，消息加入队列');
          ws.data.messageQueue.push(typeof message === 'string' ? message : message.toString());
          return;
        }

        // 转发消息到阶跃星辰API
        if (typeof message === 'string') {
          stepfunWs.send(message);
        } else {
          stepfunWs.send(message.toString());
        }
      },

      close(ws: any) {
        console.log('🔌 客户端断开连接');
        
        // 清理资源
        if (ws.data?.stepfunWs) {
          ws.data.stepfunWs.close();
        }
        if (ws.data?.messageQueue) {
          ws.data.messageQueue = [];
        }
      }
    }
  });

  console.log('🚀 WebSocket中转服务器启动在端口 8082');
  return server;
} 