# 儿童AI故事绘画Web应用 - 更新后端开发计划
> 基于Step-Realtime-Console实时语音方案

## 🔄 技术方案调整

根据Step-Realtime-Console的实现分析，我们需要做以下调整：

### 核心技术架构
```
前端React应用 ←→ Bun WebSocket中转服务(8080) ←→ 阶跃星辰step-1o-audio API
     ↓                                              ↓
 静态文件服务 ←→ Hono REST API服务(3000) ←→ step-1o-turbo-vision API
     ↓              ↓                        ↓
 图片存储      Memfire数据库          腾讯云部署
```

### Step-Realtime-Console关键特性
1. **WebSocket中转架构**：Bun原生WebSocket服务器作为安全中转
2. **WavRecorder**：实时录制PCM16格式音频流
3. **实时事件处理**：基于OpenAI Realtime API规范
4. **API Key安全**：后端Header注入，前端不暴露密钥

## 🚀 调整后的开发路线图

### Phase 1: 前端验证和WebSocket基础 (2-3天)
1. **启动现有前端**：验证React组件和基础功能
2. **WebSocket中转服务器**：
   - 复制hooks.server.ts的Bun WebSocket实现
   - 适配为独立的后端服务
   - 连接阶跃星辰step-1o-audio API
3. **音频处理集成**：
   - 集成WavRecorder替换现有语音录制
   - 移除TTS合成功能（step-1o-audio直接输出语音）

### Phase 2: 实时语音功能重构 (3-4天)
1. **前端语音组件重构**：
   - 用WavRecorder替换VoiceRecorder组件
   - 集成RealtimeClient管理WebSocket连接
   - 实现实时事件处理机制
2. **音频流处理**：
   - PCM16音频数据流转发
   - 实时语音识别和对话生成
   - WavStreamPlayer播放AI语音回应

### Phase 3: REST API和图像识别 (3-4天)
1. **Hono REST API服务**：
   - 图片上传和存储
   - step-1o-turbo-vision图像分析
   - 会话管理和状态跟踪
2. **Memfire数据库集成**：
   - 会话、对话历史、图片信息存储
   - 缓存策略优化

### Phase 4: 业务逻辑完善 (2-3天)
1. **儿童交互逻辑**：
   - 绘画意图识别
   - Unsplash图片搜索
   - 故事生成和展示
2. **前后端集成**：
   - REST API与WebSocket协同
   - 错误处理和降级机制

### Phase 5: 腾讯云部署 (2-3天)
1. **Docker容器化**：
   - Bun运行环境配置
   - HTTPS和WSS配置
2. **腾讯云部署**：
   - 服务器配置和域名绑定
   - SSL证书和安全配置

## 📁 更新后的项目结构

```
画伴app/
├── project-proj_1G6LXLNn0Th/          # 前端代码(需重构语音部分)
├── Step-Realtime-Console/             # 参考实现
├── backend/                           # 新建后端服务
│   ├── src/
│   │   ├── websocket/                 # WebSocket中转服务
│   │   │   ├── server.ts              # 基于hooks.server.ts
│   │   │   └── realtime-client.ts     # 实时事件处理
│   │   ├── api/                       # REST API服务
│   │   │   ├── routes/                # API路由
│   │   │   ├── services/              # 业务服务
│   │   │   └── models/                # 数据模型
│   │   ├── shared/                    # 共享工具
│   │   │   ├── wavtools/              # 音频处理工具
│   │   │   └── utils/                 # 通用工具
│   │   └── index.ts                   # 服务启动入口
│   ├── uploads/                       # 图片存储
│   ├── package.json
│   └── Dockerfile
├── docs/                              # 统一文档目录
└── deployment/                        # 腾讯云部署配置
```

## 🔧 核心实现要点

### 1. WebSocket中转服务（基于hooks.server.ts）
```typescript
// src/websocket/server.ts
import { serve } from 'bun';

const server = serve({
  port: 8080,
  fetch(req, server) {
    return server.upgrade(req, {
      data: { requestUrl: req.url }
    });
  },
  websocket: {
    open(ws) {
      // 连接到阶跃星辰step-1o-audio API
      const stepfunWs = new WebSocket('wss://api.stepfun.com/v1/realtime?model=step-1o-audio', {
        headers: { Authorization: `Bearer ${process.env.STEPFUN_API_KEY}` }
      });
      ws.data.stepfunWs = stepfunWs;
      // 设置消息转发...
    },
    message(ws, message) {
      // 转发音频数据到阶跃星辰API
      ws.data.stepfunWs.send(message);
    }
  }
});
```

### 2. 前端语音组件重构
```typescript
// 替换VoiceRecorder组件
import { WavRecorder } from '../shared/wavtools';
import { RealtimeClient } from '../shared/openai-realtime-api-beta';

const client = new RealtimeClient({
  url: 'ws://localhost:8080', // 连接本地中转服务器
  apiKey: 'dummy' // 实际Key在后端处理
});

const wavRecorder = new WavRecorder({ sampleRate: 24000 });
```

### 3. Memfire数据库集成
```typescript
// src/api/models/database.ts
import { createClient } from '@supabase/supabase-js';

const memfire = createClient(
  process.env.MEMFIRE_URL,
  process.env.MEMFIRE_ANON_KEY
);

export const sessions = memfire.from('sessions');
export const conversations = memfire.from('conversations');
```

## 🎯 immediate Action Plan

### 立即开始的工作
1. **验证前端功能**：
   ```bash
   cd project-proj_1G6LXLNn0Th
   python3 -m http.server 8000
   # 访问 http://localhost:8000
   ```

2. **创建WebSocket中转服务**：
   - 复制Step-Realtime-Console的hooks.server.ts
   - 改造为独立的Bun服务
   - 连接测试（需要阶跃星辰API Key）

3. **前端语音组件准备**：
   - 提取Step-Realtime-Console的wavtools
   - 准备替换VoiceRecorder组件

### 需要的资源
- ✅ 阶跃星辰API密钥（您去获取）
- ✅ Memfire数据库配置
- ✅ 腾讯云服务器信息

## 📊 更新后的时间估算

| 阶段 | 任务 | 预计工期 | 技术重点 |
|------|------|----------|----------|
| Phase 1 | 前端验证+WebSocket基础 | 2-3天 | Bun WebSocket中转 |
| Phase 2 | 实时语音重构 | 3-4天 | WavRecorder集成 |
| Phase 3 | REST API+图像识别 | 3-4天 | Memfire+视觉API |
| Phase 4 | 业务逻辑完善 | 2-3天 | 儿童交互逻辑 |
| Phase 5 | 腾讯云部署 | 2-3天 | 容器化+SSL |

**总预计工期：12-17个工作日**

---

## 🚦 当前状态

✅ **前端已启动**：http://localhost:8000  
🔄 **正在进行**：研究Step-Realtime-Console集成方案  
⏳ **等待中**：阶跃星辰API密钥和Memfire配置  

**下一步**：创建WebSocket中转服务器，验证实时语音通信 