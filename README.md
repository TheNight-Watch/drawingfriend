# 儿童AI故事绘画应用

基于阶跃星辰实时语音API的儿童AI故事创作应用，支持图片上传、实时语音交互和智能故事生成。

## 🎯 项目特性

- **实时语音交互**：基于阶跃星辰step-1o-audio的专业语音对话系统
- **图像智能分析**：支持儿童绘画作品的AI理解和分析
- **多模态交互**：图像+语音的综合交互体验
- **儿童友好界面**：专为4-6岁儿童设计的简洁交互界面
- **专业音频处理**：24kHz高质量音频录制和播放

## 🏗️ 技术架构

```
前端React应用 ←→ Bun WebSocket中转(8082) ←→ 阶跃星辰实时语音API
     ↓                                              ↓
静态文件服务 ←→ Hono REST API(3000) ←→ step-1o-turbo-vision API
     ↓              ↓                        ↓
图片存储      SQLite数据库          AI服务集成
```

### 技术栈

**前端：**
- React 18 (CDN版本)
- TailwindCSS
- WavRecorder/WavStreamPlayer (专业音频处理)
- RealtimeClient (WebSocket实时通信)

**后端：**
- Bun (高性能JavaScript运行时)
- Hono (现代Web API框架)
- WebSocket中转服务器
- 阶跃星辰AI API集成

## 🚀 快速开始

### 环境要求

- **Bun** >= 1.0.0 ([安装指南](https://bun.sh/docs/installation))
- **Python 3** (用于前端开发服务器)
- **阶跃星辰API密钥**

### 快速验证安装

```bash
# 运行环境验证脚本
./verify-setup.sh
```

### 1. 配置环境变量

在backend目录下创建`.env`文件：

```bash
# backend/.env
STEPFUN_API_KEY=your_stepfun_api_key_here
```

### 2. 启动服务

**终端1 - 启动后端服务:**
```bash
cd backend && bun run dev
```

**终端2 - 启动前端服务:**
```bash
cd project-proj_1G6LXLNn0Th && python3 -m http.server 8000
```

### 3. 访问应用

- **🧪 功能测试页面**: http://localhost:8000/test.html (推荐先访问)
- **🏠 应用首页**: http://localhost:8000/index.html
- **📸 上传页面**: http://localhost:8000/upload.html  
- **📖 故事页面**: http://localhost:8000/story.html

服务端点：
- **WebSocket服务**: ws://localhost:8082
- **REST API服务**: http://localhost:3000

## 📱 使用流程

1. **首页欢迎**：虚拟角色语音引导
2. **上传画作**：拍照或选择儿童绘画作品
3. **AI分析**：step-1o-turbo-vision分析画面内容
4. **语音交互**：实时语音对话创作故事
5. **绘画辅助**：自动搜索参考图片帮助绘画
6. **故事生成**：完整的故事创作和展示

## 🔧 开发说明

### 项目结构

```
drawingfriend_app_final/
├── project-proj_1G6LXLNn0Th/          # 前端代码
│   ├── components/                     # React组件
│   │   ├── RealtimeVoiceChat.js       # 实时语音交互组件
│   │   ├── WavRecorder.js             # 音频录制组件
│   │   └── ...                        # 其他组件
│   ├── lib/                           # 第三方库
│   │   ├── wavtools/                  # 音频处理工具
│   │   └── openai-realtime-api-beta/  # 实时API客户端
│   └── utils/                         # 工具函数
├── backend/                           # 后端服务
│   ├── src/
│   │   ├── websocket/                 # WebSocket中转服务
│   │   ├── api/                       # REST API服务
│   │   └── index.ts                   # 服务入口
│   ├── uploads/                       # 文件上传目录
│   └── package.json
├── Step-Realtime-Console/             # 参考实现
├── start-backend.sh                   # 后端启动脚本
├── start-frontend.sh                  # 前端启动脚本
└── README.md
```

### API 端点

**REST API (端口3000):**
- `GET /health` - 健康检查
- `POST /api/upload-image` - 图片上传
- `POST /api/analyze-image` - 图片分析
- `POST /api/sessions` - 创建会话
- `POST /api/conversations` - 保存对话记录
- `GET /uploads/*` - 静态文件服务

**WebSocket (端口8082):**
- 实时语音数据转发
- 阶跃星辰API代理
- 音频流处理

### 核心功能实现

**实时语音系统：**
- 基于Step-Realtime-Console架构
- 24kHz高质量音频采样
- WebSocket安全代理
- 支持语音打断和自然对话

**图片处理系统：**
- 支持多种图片格式(JPEG, PNG, GIF, WebP)
- 自动压缩和格式转换
- 安全的文件上传验证
- 静态文件服务和缓存

## 🔍 故障排除

### 常见问题

**1. 端口被占用**
```bash
# 检查端口使用情况
lsof -i :8082  # WebSocket端口
lsof -i :3000  # API端口
lsof -i :8000  # 前端端口

# 杀死占用进程
kill -9 [PID]
```

**2. 环境变量未生效**
```bash
# 确认.env文件格式正确
cat backend/.env
# 应该显示: STEPFUN_API_KEY=your_api_key

# 确认文件位置
ls -la backend/.env
```

**3. 音频权限问题**
- 确保浏览器允许麦克风访问
- 使用HTTPS访问前端(生产环境)
- 检查系统音频设备设置

**4. WebSocket连接失败**
- 确认后端WebSocket服务正常启动
- 检查防火墙设置
- 验证阶跃星辰API密钥有效性

## 📋 开发计划

### ✅ 已完成
- [x] 删除旧的语音组件和科大讯飞服务
- [x] 集成Step-Realtime-Console音频处理组件
- [x] 创建WebSocket中转服务器
- [x] 集成阶跃星辰实时语音API
- [x] 重构前端语音交互逻辑
- [x] 开发REST API服务器

### 🔄 进行中
- [ ] 集成step-1o-turbo-vision图像识别API

### ⏳ 待完成
- [ ] 设计和实现数据库模型
- [ ] 实现多模态上下文管理
- [ ] 集成Unsplash图片搜索功能
- [ ] 开发儿童友好的错误处理系统
- [ ] 实现故事生成和展示功能
- [ ] Docker容器化部署
- [ ] HTTPS/WSS安全配置
- [ ] 性能监控和日志系统

## 📄 许可证

MIT License

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 支持

如果您遇到任何问题，请：
1. 查看故障排除部分
2. 检查GitHub Issues
3. 提交新的Issue描述问题

---

**注意：** 本项目需要有效的阶跃星辰API密钥才能正常运行语音功能。请确保您已获得相应的API访问权限。# drawingfriend
