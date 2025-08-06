# 儿童AI故事绘画Web应用 - 后端开发详细计划

## 📋 项目现状分析

### 已完成的前端功能
✅ **React 18 多页面应用架构**
- 首页（home-app.js）：虚拟角色引导、语音播放
- 上传页（upload-app.js）：图片上传和预览
- 故事页（story-app.js）：AI对话交互、语音录制

✅ **核心组件实现**
- VoiceRecorder：语音录制（支持科大讯飞+浏览器语音识别）
- ImageUpload：图片上传和预览
- AIResponse：AI回应展示
- ImageGallery：参考图片展示
- StoryDisplay：故事展示

✅ **工具服务**
- speechService.js：语音合成（TTS）
- xunfeiSpeechService.js：科大讯飞语音识别
- aiService.js：AI服务（当前为模拟数据）
- imageSearchService.js：Unsplash图片搜索

### 需要开发的后端功能
🔴 **WebSocket实时通信**：参考Step-Realtime-Console实现
🔴 **AI服务集成**：Step-1o-turbo-vision + step-1o-audio
🔴 **数据持久化**：会话管理、对话历史、图片存储
🔴 **API网关**：RESTful API + 文件上传
🔴 **缓存系统**：Redis缓存热点数据

## 🎯 技术架构设计

### 后端技术栈
```
运行时：Bun (高性能JS/TS运行时)
框架：Hono (现代Web API框架)
数据库：SQLite/PostgreSQL + Drizzle ORM
缓存：Redis (会话管理、热点数据)
AI服务：阶跃星辰API (step-1o-turbo-vision + step-1o-audio)
实时通信：Bun原生WebSocket (参考Step-Realtime-Console)
文件存储：本地存储 + 静态文件服务
图片搜索：Unsplash API
```

### 系统架构图
```
前端React应用 ←→ WebSocket实时通信 ←→ Bun后端服务
     ↓                                    ↓
 静态文件服务 ←→ Hono API网关 ←→ 阶跃星辰AI服务
     ↓              ↓              ↓
 图片存储      SQLite数据库    Redis缓存
```

## 🚀 开发路线图

### Phase 1: 基础架构搭建 (2-3天)
1. **项目初始化**
   - 创建Bun + Hono项目结构
   - 配置TypeScript和开发环境
   - 设置基础中间件（CORS、日志、错误处理）

2. **数据库设计**
   - 设计表结构（sessions、conversations、images、search_logs）
   - 实现Drizzle ORM模型
   - 创建数据库迁移脚本

3. **静态文件服务**
   - 实现图片上传和存储
   - 配置静态文件访问路由
   - 图片压缩和格式转换

### Phase 2: WebSocket实时通信 (3-4天)
1. **参考Step-Realtime-Console实现**
   - 分析Step-Realtime-Console的WebSocket架构
   - 实现WebSocket中转服务器
   - 适配阶跃星辰step-1o-audio API

2. **语音流处理**
   - 实现音频数据流转发
   - 集成语音识别转文字
   - 实现文字转语音合成

3. **前端WebSocket集成**
   - 修改前端VoiceRecorder组件
   - 实现WebSocket连接管理
   - 添加实时状态监控

### Phase 3: AI服务集成 (4-5天)
1. **图像识别API**
   - 集成step-1o-turbo-vision
   - 实现图片分析和内容理解
   - 设计分析结果数据结构

2. **对话生成API**
   - 集成step-1o-audio对话生成
   - 实现上下文管理和记忆
   - 设计儿童友好的对话策略

3. **绘画意图识别**
   - 实现关键词检测算法
   - 触发Unsplash图片搜索
   - 返回参考图片数据

### Phase 4: API端点实现 (3-4天)
1. **核心API接口**
   ```
   POST /api/analyze-image     # 图片分析
   POST /api/chat              # AI对话
   GET  /api/search-images     # 图片搜索
   GET  /api/conversations/:id # 对话历史
   POST /api/generate-story    # 故事生成
   ```

2. **会话管理**
   - 实现会话创建和管理
   - 对话历史存储和检索
   - 会话状态跟踪

3. **缓存策略**
   - Redis缓存AI分析结果
   - 图片搜索结果缓存
   - 会话数据缓存

### Phase 5: 前端集成调试 (2-3天)
1. **前端代码调整**
   - 修改aiService.js连接真实API
   - 更新WebSocket连接逻辑
   - 调整错误处理机制

2. **功能测试**
   - 端到端流程测试
   - AI服务响应测试
   - 语音交互测试

### Phase 6: 部署和优化 (2-3天)
1. **Docker化部署**
   - 创建Dockerfile和docker-compose
   - 配置HTTPS和SSL证书
   - 环境变量和配置管理

2. **性能优化**
   - API响应时间优化
   - 图片处理优化
   - 缓存策略调优

## 📁 项目目录结构

```
画伴app/
├── project-proj_1G6LXLNn0Th/          # 前端代码
│   ├── components/                     # React组件
│   ├── utils/                          # 工具函数
│   ├── *.html                         # 页面文件
│   └── *-app.js                       # 应用入口
│
├── backend/                           # 新建后端代码
│   ├── src/
│   │   ├── routes/                    # API路由
│   │   │   ├── analyze.ts             # 图片分析路由
│   │   │   ├── chat.ts                # 对话路由
│   │   │   ├── search.ts              # 图片搜索路由
│   │   │   ├── websocket.ts           # WebSocket路由
│   │   │   └── index.ts               # 路由汇总
│   │   ├── services/                  # 业务服务
│   │   │   ├── aiService.ts           # AI服务集成
│   │   │   ├── imageService.ts        # 图片处理服务
│   │   │   ├── speechService.ts       # 语音服务
│   │   │   └── cacheService.ts        # 缓存服务
│   │   ├── models/                    # 数据模型
│   │   │   ├── database.ts            # 数据库连接
│   │   │   ├── session.ts             # 会话模型
│   │   │   ├── conversation.ts        # 对话模型
│   │   │   └── image.ts               # 图片模型
│   │   ├── middleware/                # 中间件
│   │   │   ├── cors.ts                # CORS配置
│   │   │   ├── upload.ts              # 文件上传
│   │   │   ├── rateLimit.ts           # 频率限制
│   │   │   └── errorHandler.ts        # 错误处理
│   │   ├── utils/                     # 工具函数
│   │   │   ├── crypto.ts              # 加密工具
│   │   │   ├── validation.ts          # 数据验证
│   │   │   └── logger.ts              # 日志工具
│   │   └── index.ts                   # 应用入口
│   ├── uploads/                       # 文件上传目录
│   ├── database/                      # 数据库文件
│   ├── docker/                        # Docker配置
│   ├── package.json                   # 依赖配置
│   ├── bun.lockb                      # 锁定文件
│   ├── Dockerfile                     # Docker镜像
│   ├── docker-compose.yml             # 容器编排
│   └── .env                           # 环境变量
│
└── docs/                              # 文档
    ├── api-documentation.md           # API文档
    ├── deployment-guide.md            # 部署指南
    └── development-notes.md           # 开发笔记
```

## 🔧 核心实现要点

### 1. WebSocket实时语音通信
基于Step-Realtime-Console的架构：
```typescript
// WebSocket中转服务器
export function createWebSocketHandler() {
  return {
    message: async (ws, message) => {
      // 转发消息到阶跃星辰API
      const response = await stepfunAudioAPI.send(message);
      ws.send(response);
    },
    open: (ws) => {
      // 建立与阶跃星辰的连接
      connectToStepfunAPI(ws);
    },
    close: (ws) => {
      // 清理连接
      disconnectFromStepfunAPI(ws);
    }
  };
}
```

### 2. AI服务集成
```typescript
// 图像识别服务
export async function analyzeImageWithStepfun(imagePath: string) {
  const response = await fetch('https://api.stepfun.com/v1/vision', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STEPFUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'step-1o-turbo-vision',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '分析这幅儿童绘画...' },
          { type: 'image_url', image_url: { url: imagePath } }
        ]
      }]
    })
  });
  return response.json();
}
```

### 3. 数据库模型设计
```typescript
// Drizzle ORM 表定义
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  imageId: text('image_id'),
  imageUrl: text('image_url'),
  imageAnalysis: text('image_analysis', { mode: 'json' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('active')
});

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  userInput: text('user_input').notNull(),
  aiResponse: text('ai_response').notNull(),
  conversationType: text('conversation_type').default('story'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});
```

## 🛡️ 安全和性能考虑

### 安全措施
- **API密钥保护**：环境变量存储，避免前端暴露
- **文件上传安全**：类型验证、大小限制、路径检查
- **Rate Limiting**：API调用频率限制
- **数据验证**：输入参数严格验证
- **CORS配置**：跨域请求控制

### 性能优化
- **缓存策略**：Redis缓存AI分析结果和搜索结果
- **图片优化**：自动压缩、格式转换
- **连接池**：数据库连接池管理
- **异步处理**：AI服务调用异步化
- **CDN加速**：静态资源CDN分发

## 📊 开发进度追踪

| 阶段 | 任务 | 预计工期 | 状态 | 负责人 |
|------|------|----------|------|--------|
| Phase 1 | 基础架构搭建 | 2-3天 | 🔄 待开始 | 开发者 |
| Phase 2 | WebSocket通信 | 3-4天 | ⏳ 等待中 | 开发者 |
| Phase 3 | AI服务集成 | 4-5天 | ⏳ 等待中 | 开发者 |
| Phase 4 | API端点实现 | 3-4天 | ⏳ 等待中 | 开发者 |
| Phase 5 | 前端集成调试 | 2-3天 | ⏳ 等待中 | 开发者 |
| Phase 6 | 部署和优化 | 2-3天 | ⏳ 等待中 | 开发者 |

**总预计工期：16-22个工作日**

## 🔍 风险评估和应对

### 主要风险点
1. **AI API集成复杂度**：阶跃星辰API文档可能不完整
   - *应对*：准备替代方案（OpenAI GPT-4V）

2. **WebSocket稳定性**：实时语音通信可能不稳定
   - *应对*：实现自动重连和降级机制

3. **性能瓶颈**：AI服务响应延迟影响用户体验
   - *应对*：实现缓存策略和异步处理

4. **部署复杂度**：HTTPS配置和容器化部署
   - *应对*：使用成熟的部署方案和监控工具

### 质量保证
- **代码审查**：关键功能代码审查
- **单元测试**：核心服务单元测试覆盖
- **集成测试**：端到端流程测试
- **性能测试**：并发访问和压力测试

## 🎯 成功标准

### 功能完整性
- ✅ 图片上传和AI分析正常工作
- ✅ 实时语音交互流畅无延迟
- ✅ AI对话生成符合儿童交互需求
- ✅ 绘画参考图片搜索准确有效
- ✅ 故事生成和展示完整

### 性能指标
- API响应时间 < 2秒
- 语音识别延迟 < 1秒
- 图片上传成功率 > 98%
- WebSocket连接稳定性 > 99%

### 用户体验
- 界面响应流畅
- 错误提示友好
- 功能引导清晰
- 移动端适配良好

---

## 💡 下一步行动

1. **确认技术选型**：确认使用Bun + Hono + 阶跃星辰AI的技术栈
2. **环境准备**：获取阶跃星辰API密钥和相关文档
3. **开始Phase 1**：搭建基础后端架构
4. **并行研究**：深入研究Step-Realtime-Console的WebSocket实现

请确认这个开发计划是否符合您的期望，我们可以根据具体需求进行调整优化。 