import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeImage } from './vision';
import baiduImage from './baidu-image';

import { join } from 'path';

const app = new Hono();

// 启用CORS
app.use('*', cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 集成百度图片搜索API
app.route('/api/images', baiduImage);

// 静态文件服务
app.get('/uploads/*', async (c) => {
  const filePath = c.req.path.replace('/uploads/', '');
  const file = Bun.file(join(process.cwd(), 'uploads', filePath));
  
  if (!(await file.exists())) {
    return c.notFound();
  }
  
  return new Response(file);
});

// 图片上传和分析
app.post('/api/upload-image', async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!imageFile) {
      return c.json({ error: '没有上传图片' }, 400);
    }

    if (!sessionId) {
      return c.json({ error: '缺少sessionId' }, 400);
    }

    // 保存图片文件
    const filename = `${sessionId}_${Date.now()}_${imageFile.name}`;
    const filepath = join(process.cwd(), 'uploads', filename);
    
    const arrayBuffer = await imageFile.arrayBuffer();
    await Bun.write(filepath, arrayBuffer);
    
    console.log(`📸 图片已保存: ${filename}`);

    // 调用阶跃星辰图像识别API，传递文件路径
    console.log(`🔍 开始分析图片: ${filepath}`);
    const analysis = await analyzeImage(filepath);
    
    console.log(`✅ 图片分析完成`);

    return c.json({
      success: true,
      filename,
      url: `/uploads/${filename}`,
      analysis: {
        description: analysis,
        timestamp: new Date().toISOString()
      },
      sessionId
    });

  } catch (error) {
    console.error('❌ 图片上传分析失败:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : '图片处理失败' 
    }, 500);
  }
});

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export function startAPIServer() {
  const server = Bun.serve({
    port: 3000,
    fetch: app.fetch,
  });

  console.log('🚀 REST API服务器启动在端口 3000');
  return server;
} 