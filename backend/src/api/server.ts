import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeImage } from './vision';

import { join } from 'path';

const app = new Hono();

// 启用CORS
app.use('*', cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

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

// 🖼️ 图片搜索接口 - Unsplash API
app.get('/api/search-images', async (c) => {
  try {
    const keyword = c.req.query('keyword');
    
    if (!keyword) {
      return c.json({ error: '缺少搜索关键词' }, 400);
    }

    // 获取Unsplash API Key
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashAccessKey) {
      console.error('❌ 缺少 UNSPLASH_ACCESS_KEY 环境变量');
      return c.json({ error: 'Unsplash API配置错误' }, 500);
    }

    console.log('🔍 开始搜索图片:', keyword);

    // 关键词映射 - 将中文转换为英文搜索词
    const keywordMap: Record<string, string> = {
      '小狗': 'cute dog puppy',
      '小猫': 'cute cat kitten', 
      '房子': 'house home building',
      '花朵': 'flower blossom',
      '汽车': 'car vehicle automobile',
      '树': 'tree nature',
      '太阳': 'sun sunshine',
      '月亮': 'moon night',
      '星星': 'stars night sky',
      '彩虹': 'rainbow colorful',
      '蝴蝶': 'butterfly nature',
      '鸟': 'bird flying',
      '鱼': 'fish ocean sea',
      '飞机': 'airplane aircraft',
      '船': 'boat ship water',
    };

    // 转换搜索关键词
    const searchQuery = keywordMap[keyword] || keyword;
    
    // 调用Unsplash API
    const unsplashUrl = new URL('https://api.unsplash.com/search/photos');
    unsplashUrl.searchParams.set('query', searchQuery);
    unsplashUrl.searchParams.set('page', '1');
    unsplashUrl.searchParams.set('per_page', '9'); // 3x3网格
    unsplashUrl.searchParams.set('orientation', 'landscape');

    const response = await fetch(unsplashUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${unsplashAccessKey}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    // 处理返回数据，只保留需要的字段
    const images = data.results?.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.small, // 使用small尺寸图片
      alt: photo.alt_description || photo.description || `${keyword}图片`,
      photographer: photo.user.name,
      photographer_url: photo.user.links.html,
      download_url: photo.links.download_location
    })) || [];

    console.log(`✅ 图片搜索成功，找到 ${images.length} 张图片`);

    return c.json({
      success: true,
      keyword: keyword,
      search_query: searchQuery,
      images: images,
      total: data.total || 0
    });

  } catch (error) {
    console.error('❌ 图片搜索失败:', error);
    return c.json({ 
      success: false,
      error: '图片搜索失败：' + (error instanceof Error ? error.message : '未知错误'),
      images: []
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