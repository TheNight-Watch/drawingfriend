import { Hono } from 'hono';
import { env } from 'bun';

const baiduImage = new Hono();

// 百度图片搜索配置
const BAIDU_IMAGE_BASE_URL = 'https://image.baidu.com/search/acjson';

// 中文关键词优化映射（针对儿童绘画场景）
const KEYWORD_OPTIMIZATION = {
  '小狗': '小狗 可爱 卡通 简单',
  '小猫': '小猫 可爱 萌宠 卡通',
  '房子': '房子 简笔画 卡通 儿童画',
  '树': '大树 简单 卡通 儿童画',
  '花': '花朵 简单 卡通 彩色',
  '汽车': '汽车 卡通 简单 儿童画',
  '飞机': '飞机 卡通 简单 儿童画',
  '太阳': '太阳 卡通 简单 笑脸',
  '月亮': '月亮 卡通 简单 弯月',
  '星星': '星星 卡通 简单 闪闪',
  '彩虹': '彩虹 卡通 七色 简单',
  '蝴蝶': '蝴蝶 卡通 彩色 简单',
  '鸟': '小鸟 卡通 可爱 简单',
  '人物': '卡通人物 简单 儿童画',
  '动物': '卡通动物 可爱 简单',
  '植物': '植物 卡通 简单 绿色',
  '建筑': '建筑 卡通 简单 房屋',
  '风景': '风景 卡通 简单 美丽',
  '城堡': '城堡 童话 卡通 简单',
  '公主': '公主 卡通 可爱 童话',
  '超人': '超人 卡通 儿童 英雄',
  '恐龙': '恐龙 卡通 可爱 简单',
  '海洋': '大海 卡通 蓝色 简单',
  '山': '大山 卡通 简单 绿色',
  '森林': '森林 卡通 绿色 简单',
  '草地': '草地 绿色 卡通 简单',
  '雪花': '雪花 卡通 白色 简单',
  '火车': '火车 卡通 简单 儿童画',
  '船': '小船 卡通 简单 儿童画',
  '城市': '城市 卡通 简单 建筑',
  '农场': '农场 卡通 动物 简单',
  '学校': '学校 卡通 建筑 简单'
};

// 优化搜索关键词
function optimizeKeyword(query: string): string {
  let optimizedQuery = query;
  
  // 检查是否有预定义的优化关键词
  for (const [chinese, optimized] of Object.entries(KEYWORD_OPTIMIZATION)) {
    if (query.includes(chinese)) {
      optimizedQuery = optimized;
      break;
    }
  }
  
  // 如果没有找到匹配，添加通用的儿童画关键词
  if (optimizedQuery === query) {
    optimizedQuery = `${query} 卡通 简单 儿童画`;
  }
  
  console.log(`🔤 关键词优化: "${query}" -> "${optimizedQuery}"`);
  return optimizedQuery;
}

// 构建百度图片搜索请求URL
function buildBaiduImageURL(keyword: string, page: number = 0, count: number = 6): string {
  const params = new URLSearchParams({
    'tn': 'resultjson_com',
    'word': keyword,
    'queryWord': keyword,
    'cl': '2',
    'lm': '-1',
    'ie': 'utf-8',
    'oe': 'utf-8',
    'adpicid': '',
    'st': '-1',
    'z': '',
    'ic': '0',
    'hd': '',
    'latest': '',
    'copyright': '',
    's': '',
    'se': '',
    'tab': '',
    'width': '',
    'height': '',
    'face': '0',
    'istype': '2',
    'qc': '',
    'nc': '1',
    'expermode': '',
    'nojc': '',
    'isAsync': '',
    'pn': (page * 30).toString(),
    'rn': Math.min(count * 5, 30).toString(), // 多获取一些，然后过滤
    'gsm': '1e',
    '1734604159296': ''
  });

  return `${BAIDU_IMAGE_BASE_URL}?${params.toString()}`;
}

// 格式化百度图片搜索结果
function formatBaiduResults(data: any, query: string, count: number): any[] {
  if (!data || !data.data) {
    return [];
  }

  const results: any[] = [];
  
  // 百度返回的数据在data字段中
  for (let i = 0; i < data.data.length && results.length < count; i++) {
    const item = data.data[i];
    
    // 跳过无效的数据
    if (!item || !item.thumbURL || !item.middleURL) {
      continue;
    }
    
    // 过滤掉一些不适合儿童的内容（通过简单的关键词过滤）
    const title = (item.fromPageTitle || item.fromPageTitleEnc || '').toLowerCase();
    const skipKeywords = ['sexy', 'adult', '性感', '成人', '裸体'];
    if (skipKeywords.some(keyword => title.includes(keyword))) {
      continue;
    }

    results.push({
      id: item.id || `baidu_${i}_${Date.now()}`,
      url: item.middleURL || item.thumbURL, // 中等尺寸图片
      thumbnail: item.thumbURL, // 缩略图
      small: item.thumbURL,
      large: item.objURL || item.middleURL, // 原图URL
      description: item.fromPageTitle || item.fromPageTitleEnc || query,
      source_url: item.fromURL || '#',
      width: parseInt(item.width) || 400,
      height: parseInt(item.height) || 300,
      file_size: item.size || 'unknown',
      colors: {
        dominant: '#' + (Math.random() * 16777215 | 0).toString(16), // 随机颜色作为占位
        palette: ['#' + (Math.random() * 16777215 | 0).toString(16)]
      },
      // 儿童友好标记
      child_friendly: true,
      source: 'baidu'
    });
  }
  
  return results;
}

// 搜索图片API
baiduImage.get('/search', async (c) => {
  try {
    const { query, count = '6', page = '0' } = c.req.query();
    
    if (!query) {
      return c.json({ error: 'Missing query parameter' }, 400);
    }

    const pageNum = parseInt(page) || 0;
    const countNum = Math.min(parseInt(count) || 6, 20); // 最多20张

    console.log(`🔍 百度图片搜索请求: query="${query}", count=${countNum}, page=${pageNum}`);

    // 优化搜索关键词
    const optimizedQuery = optimizeKeyword(query);

    // 构建百度图片搜索URL
    const searchURL = buildBaiduImageURL(optimizedQuery, pageNum, countNum);
    console.log(`🌐 请求百度图片API: ${searchURL}`);

    // 发送请求到百度图片搜索
    const response = await fetch(searchURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://image.baidu.com/',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      console.error(`❌ 百度图片API错误: ${response.status} ${response.statusText}`);
      throw new Error(`Baidu Image API error: ${response.status}`);
    }

    const responseText = await response.text();
    
    // 百度的响应可能包含一些JavaScript代码，需要提取JSON部分
    let jsonData;
    try {
      // 尝试直接解析JSON
      jsonData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ 解析百度图片API响应失败:', parseError);
      
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = responseText.match(/\{.*\}/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析百度图片API响应');
      }
    }

    console.log(`✅ 百度图片API响应成功: 原始数据长度 ${jsonData?.data?.length || 0}`);

    // 格式化响应数据
    const formattedResults = formatBaiduResults(jsonData, query, countNum);

    console.log(`📸 格式化后的图片数量: ${formattedResults.length}`);

    return c.json({
      success: true,
      query: query,
      optimized_query: optimizedQuery,
      page: pageNum,
      total: formattedResults.length,
      results: formattedResults
    });

  } catch (error) {
    console.error('❌ 百度图片搜索失败:', error);
    
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
      id: 'fallback-baidu-1',
      url: 'https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=2849293908,1764511306&fm=26&gp=0.jpg',
      thumbnail: 'https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=2849293908,1764511306&fm=26&gp=0.jpg',
      small: 'https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=2849293908,1764511306&fm=26&gp=0.jpg',
      description: `${query}参考图片1`,
      source_url: '#',
      width: 400,
      height: 300,
      child_friendly: true,
      source: 'fallback-baidu'
    },
    {
      id: 'fallback-baidu-2',
      url: 'https://ss1.bdstatic.com/70cFvXSh_Q1YnxGkpoWK1HF6hhy/it/u=3363295869,2467511306&fm=26&gp=0.jpg',
      thumbnail: 'https://ss1.bdstatic.com/70cFvXSh_Q1YnxGkpoWK1HF6hhy/it/u=3363295869,2467511306&fm=26&gp=0.jpg',
      small: 'https://ss1.bdstatic.com/70cFvXSh_Q1YnxGkpoWK1HF6hhy/it/u=3363295869,2467511306&fm=26&gp=0.jpg',
      description: `${query}参考图片2`,
      source_url: '#',
      width: 400,
      height: 300,
      child_friendly: true,
      source: 'fallback-baidu'
    }
  ];

  // 如果是小狗，返回专门的图片链接
  if (query.includes('小狗') || query.includes('狗')) {
    return [
      {
        id: 'puppy-baidu-1',
        url: 'https://ss2.bdstatic.com/70cFvnSh_Q1YnxGkpoWK1HF6hhy/it/u=1750825150,2398706831&fm=26&gp=0.jpg',
        thumbnail: 'https://ss2.bdstatic.com/70cFvnSh_Q1YnxGkpoWK1HF6hhy/it/u=1750825150,2398706831&fm=26&gp=0.jpg',
        small: 'https://ss2.bdstatic.com/70cFvnSh_Q1YnxGkpoWK1HF6hhy/it/u=1750825150,2398706831&fm=26&gp=0.jpg',
        description: '可爱的小狗',
        source_url: '#',
        width: 400,
        height: 300,
        child_friendly: true,
        source: 'fallback-baidu'
      },
      {
        id: 'puppy-baidu-2',
        url: 'https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=2528287648,2857815915&fm=26&gp=0.jpg',
        thumbnail: 'https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=2528287648,2857815915&fm=26&gp=0.jpg',
        small: 'https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=2528287648,2857815915&fm=26&gp=0.jpg',
        description: '卡通小狗',
        source_url: '#',
        width: 400,
        height: 300,
        child_friendly: true,
        source: 'fallback-baidu'
      }
    ];
  }

  return baseImages;
}

// 获取热门搜索关键词
baiduImage.get('/trending', async (c) => {
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
baiduImage.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Baidu Image Search API',
    timestamp: new Date().toISOString(),
    description: '百度图片搜索服务'
  });
});

export default baiduImage;