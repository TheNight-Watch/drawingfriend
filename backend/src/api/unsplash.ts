import { Hono } from 'hono';
import { env } from 'bun';

const unsplash = new Hono();

// Unsplash API配置
const UNSPLASH_BASE_URL = 'https://api.unsplash.com';
const UNSPLASH_ACCESS_KEY = env.UNSPLASH_ACCESS_KEY || 'demo-key';

// 中文关键词到英文的映射
const KEYWORD_TRANSLATIONS = {
  '小狗': 'cute puppy dog',
  '小猫': 'cute kitten cat',
  '房子': 'house home building',
  '树': 'tree nature',
  '花': 'flower blossom',
  '汽车': 'car vehicle',
  '飞机': 'airplane plane',
  '太阳': 'sun sunshine',
  '月亮': 'moon crescent',
  '星星': 'stars night sky',
  '彩虹': 'rainbow colorful',
  '蝴蝶': 'butterfly nature',
  '鸟': 'bird flying',
  '人物': 'people person',
  '动物': 'animal wildlife',
  '植物': 'plant nature',
  '建筑': 'building architecture',
  '风景': 'landscape nature scenery',
  '城堡': 'castle fairy tale',
  '公主': 'princess fairy tale',
  '超人': 'superhero cartoon',
  '恐龙': 'dinosaur prehistoric',
  '海洋': 'ocean sea water',
  '山': 'mountain landscape',
  '森林': 'forest trees',
  '草地': 'grass field meadow',
  '雪花': 'snowflake winter',
  '火车': 'train locomotive',
  '船': 'boat ship water',
  '城市': 'city urban skyline',
  '农场': 'farm countryside',
  '学校': 'school building education'
};

// 翻译中文关键词为英文
function translateKeywords(query: string): string {
  let translatedQuery = query;
  
  // 直接匹配翻译
  for (const [chinese, english] of Object.entries(KEYWORD_TRANSLATIONS)) {
    if (query.includes(chinese)) {
      translatedQuery = english;
      break;
    }
  }
  
  // 如果没有找到匹配，使用原查询词加上一些通用描述
  if (translatedQuery === query) {
    translatedQuery = `${query} cute cartoon children drawing`;
  }
  
  console.log(`📝 关键词翻译: "${query}" -> "${translatedQuery}"`);
  return translatedQuery;
}

// 搜索图片API
unsplash.get('/search', async (c) => {
  try {
    const { query, count = '6', orientation = 'landscape' } = c.req.query();
    
    if (!query) {
      return c.json({ error: 'Missing query parameter' }, 400);
    }

    console.log(`🔍 Unsplash搜索请求: query="${query}", count=${count}`);

    // 翻译中文关键词
    const translatedQuery = translateKeywords(query);

    // 构建Unsplash API请求
    const unsplashUrl = new URL(`${UNSPLASH_BASE_URL}/search/photos`);
    unsplashUrl.searchParams.set('query', translatedQuery);
    unsplashUrl.searchParams.set('per_page', count);
    unsplashUrl.searchParams.set('orientation', orientation);
    unsplashUrl.searchParams.set('content_filter', 'high'); // 过滤内容
    unsplashUrl.searchParams.set('order_by', 'relevant'); // 按相关性排序

    console.log(`🌐 请求Unsplash API: ${unsplashUrl.toString()}`);

    const response = await fetch(unsplashUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
        'User-Agent': 'DrawingFriend-App/1.0'
      }
    });

    if (!response.ok) {
      console.error(`❌ Unsplash API错误: ${response.status} ${response.statusText}`);
      
      if (response.status === 403) {
        return c.json({ error: 'API key invalid or rate limit exceeded' }, 403);
      }
      
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Unsplash API响应: 找到${data.results?.length || 0}张图片`);

    // 格式化响应数据
    const formattedResults = data.results?.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnail: photo.urls.thumb,
      small: photo.urls.small,
      description: photo.alt_description || query,
      author: photo.user.name,
      author_url: photo.user.links.html,
      download_url: photo.links.download,
      colors: {
        dominant: photo.color,
        palette: [photo.color]
      },
      width: photo.width,
      height: photo.height,
      likes: photo.likes,
      // 添加儿童友好的标签
      child_friendly: true,
      source: 'unsplash'
    })) || [];

    return c.json({
      success: true,
      query: query,
      translated_query: translatedQuery,
      total: data.total || 0,
      results: formattedResults
    });

  } catch (error) {
    console.error('❌ Unsplash搜索失败:', error);
    
    // 返回后备数据
    const fallbackData = getFallbackImages(c.req.query('query') || 'drawing');
    
    return c.json({
      success: false,
      error: 'Search failed, returning fallback data',
      query: c.req.query('query'),
      results: fallbackData,
      fallback: true
    });
  }
});

// 后备图片数据（当API失败时使用）
function getFallbackImages(query: string) {
  const baseImages = [
    {
      id: 'fallback-1',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300',
      small: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
      description: `${query}参考图片1`,
      author: 'Unsplash',
      author_url: 'https://unsplash.com',
      download_url: '#',
      child_friendly: true,
      source: 'fallback'
    },
    {
      id: 'fallback-2',
      url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300',
      small: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
      description: `${query}参考图片2`,
      author: 'Unsplash',
      author_url: 'https://unsplash.com',
      download_url: '#',
      child_friendly: true,
      source: 'fallback'
    }
  ];

  // 如果是小狗，返回专门的小狗图片
  if (query.includes('小狗') || query.includes('狗')) {
    return [
      {
        id: 'puppy-1',
        url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300',
        small: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
        description: '可爱的金毛小狗',
        author: 'Unsplash',
        author_url: 'https://unsplash.com',
        download_url: '#',
        child_friendly: true,
        source: 'fallback'
      },
      {
        id: 'puppy-2',
        url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300',
        small: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
        description: '坐着的小狗',
        author: 'Unsplash',
        author_url: 'https://unsplash.com',
        download_url: '#',
        child_friendly: true,
        source: 'fallback'
      }
    ];
  }

  return baseImages;
}

// 获取热门搜索关键词
unsplash.get('/trending', async (c) => {
  const trendingKeywords = [
    '小狗', '小猫', '彩虹', '花朵', '蝴蝶',
    '城堡', '太阳', '月亮', '星星', '树',
    '房子', '汽车', '飞机', '船', '火车'
  ];

  return c.json({
    success: true,
    keywords: trendingKeywords
  });
});

// 健康检查
unsplash.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Unsplash API',
    timestamp: new Date().toISOString(),
    api_key_configured: !!UNSPLASH_ACCESS_KEY && UNSPLASH_ACCESS_KEY !== 'demo-key'
  });
});

export default unsplash;