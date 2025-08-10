# 🚀 Railway一键部署指南

## 📋 准备工作

### 1. 确认文件已创建
- ✅ `railway.json` - Railway部署配置
- ✅ `nixpacks.toml` - Nixpacks构建配置  
- ✅ `.env.example` - 环境变量模板
- ✅ 修改了 `backend/src/api/server.ts` - 添加静态文件服务和健康检查
- ✅ 修改了 `backend/package.json` - 添加engines字段

### 2. 环境变量准备
您需要准备以下环境变量：
```
STEPFUN_API_KEY=your_stepfun_api_key_here
```

## 🚀 部署步骤

### 第一步：推送代码到GitHub
```bash
git add .
git commit -m "Add Railway deployment configuration
- Add railway.json and nixpacks.toml for deployment
- Add static file serving for frontend 
- Add health check endpoint
- Support Railway PORT environment variable"
git push origin main
```

### 第二步：在Railway创建项目
1. 访问 [Railway Dashboard](https://railway.app)
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 选择您的 `drawingfriend` 仓库
5. 点击 **"Deploy Now"**

### 第三步：配置环境变量
在Railway项目部署完成后：
1. 进入项目设置页面
2. 点击 **"Variables"** 标签
3. 添加环境变量：
   ```
   STEPFUN_API_KEY=your_actual_stepfun_api_key
   ```
4. 点击保存

### 第四步：生成域名
1. 进入项目 **"Settings"**
2. 找到 **"Networking"** 部分
3. 点击 **"Generate Domain"**
4. 获得类似 `https://your-app.railway.app` 的域名

## 🎯 部署后验证

### 访问测试
- **首页**: `https://your-app.railway.app/`
- **上传页**: `https://your-app.railway.app/upload.html`
- **故事页**: `https://your-app.railway.app/story.html`
- **健康检查**: `https://your-app.railway.app/health`
- **API测试**: `https://your-app.railway.app/api/`

### 功能验证清单
- [ ] 前端页面正常加载
- [ ] 图片上传功能正常
- [ ] WebSocket连接正常（语音功能）
- [ ] API接口响应正常
- [ ] 健康检查返回正常

## 🔧 架构说明

### 服务架构
```
Railway Deployment
├── Frontend (静态文件)
│   ├── index.html (首页)
│   ├── upload.html (上传页)
│   ├── story.html (故事页)
│   └── components/ (React组件)
├── Backend API (端口3000)
│   ├── /health (健康检查)
│   ├── /api/* (REST API)
│   ├── /uploads/* (文件服务)
│   └── /* (静态文件fallback)
└── WebSocket Service (端口8082)
    └── 阶跃星辰API代理
```

### 端口说明
- Railway会自动分配PORT环境变量
- WebSocket服务仍使用8082端口（Railway内部代理）
- 外部访问统一通过Railway提供的域名

## ⚠️ 注意事项

### 环境变量安全
- 永远不要将 `STEPFUN_API_KEY` 提交到Git
- 在Railway控制台中安全配置环境变量

### 部署监控
- 查看Railway的部署日志
- 监控健康检查状态
- 检查服务运行状态

### 故障排除
1. **部署失败**: 检查nixpacks构建日志
2. **静态文件404**: 确认文件路径正确
3. **API错误**: 检查环境变量配置
4. **WebSocket连接失败**: 确认Railway域名在CORS配置中

## 🔄 更新部署

后续代码更新只需要：
```bash
git add .
git commit -m "Update: your changes"
git push origin main
```
Railway会自动检测代码变更并重新部署。

## 📞 支持

如果遇到问题：
1. 检查Railway部署日志
2. 访问 `/health` 端点检查服务状态
3. 确认环境变量配置正确
4. 查看项目的GitHub issues

---

✨ **Railway部署配置已完成！现在您可以进行一键部署了。** 