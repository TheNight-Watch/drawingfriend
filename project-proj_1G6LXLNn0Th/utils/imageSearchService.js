// Image Search Service for Drawing Assistance
class ImageSearchService {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api/images';
  }

  // Search images using our backend API (which connects to Unsplash)
  async searchImages(query, count = 6) {
    try {
      console.log(`🔍 搜索图片: "${query}", count: ${count}`);
      
      const url = `${this.apiBaseUrl}/search?query=${encodeURIComponent(query)}&count=${count}`;
      console.log(`📡 API请求: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error(`❌ API请求失败: ${response.status} ${response.statusText}`);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API响应成功: 找到${data.results?.length || 0}张图片`);
      
      if (!data.success && data.fallback) {
        console.warn('⚠️ 使用后备数据');
      }
      
      return data.results || [];
      
    } catch (error) {
      console.error('❌ 图片搜索失败:', error);
      // Fallback to mock data
      console.log('📦 使用本地Mock数据作为后备');
      return this.getMockImages(query, count);
    }
  }

  // 检查API健康状态
  async checkHealth() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ API健康检查失败:', error);
      return { status: 'error', error: error.message };
    }
  }

  // 获取热门搜索关键词
  async getTrendingKeywords() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/trending`);
      const data = await response.json();
      return data.keywords || [];
    } catch (error) {
      console.error('❌ 获取热门关键词失败:', error);
      return ['小狗', '小猫', '彩虹', '花朵', '蝴蝶'];
    }
  }

  // Mock image data for development
  getMockImages(query, count = 6) {
    // Special puppy images for testing
    if (query.includes('小狗') || query.includes('狗')) {
      const puppyImages = [
        {
          id: 'puppy1',
          url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
          thumbnail: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200',
          description: '可爱的金毛小狗',
          author: 'Unsplash',
          downloadUrl: '#'
        },
        {
          id: 'puppy2',
          url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
          thumbnail: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200',
          description: '坐着的小狗',
          author: 'Unsplash',
          downloadUrl: '#'
        },
        {
          id: 'puppy3',
          url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',
          thumbnail: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=200',
          description: '奔跑的小狗',
          author: 'Unsplash',
          downloadUrl: '#'
        },
        {
          id: 'puppy4',
          url: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800',
          thumbnail: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=200',
          description: '趴着的小狗',
          author: 'Unsplash',
          downloadUrl: '#'
        },
        {
          id: 'puppy5',
          url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800',
          thumbnail: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=200',
          description: '玩球的小狗',
          author: 'Unsplash',
          downloadUrl: '#'
        },
        {
          id: 'puppy6',
          url: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800',
          thumbnail: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=200',
          description: '微笑的小狗',
          author: 'Unsplash',
          downloadUrl: '#'
        }
      ];
      return puppyImages.slice(0, count);
    }

    // Default mock images for other queries
    const mockImages = [
      {
        id: '1',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
        description: `${query}参考图片1`,
        author: 'Unsplash',
        downloadUrl: '#'
      },
      {
        id: '2', 
        url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200',
        description: `${query}参考图片2`,
        author: 'Unsplash',
        downloadUrl: '#'
      },
      {
        id: '3',
        url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800', 
        thumbnail: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=200',
        description: `${query}参考图片3`,
        author: 'Unsplash',
        downloadUrl: '#'
      }
    ];

    return mockImages.slice(0, count);
  }

  // Analyze if user wants to draw something
  analyzeDrawingIntent(userInput) {
    const drawingKeywords = [
      '画', '绘画', '画画', '不会画', '怎么画', '画法',
      '想画', '要画', '画个', '画一个', '画出',
      'draw', 'drawing', 'paint', 'sketch'
    ];

    const objectKeywords = [
      '小狗', '小猫', '房子', '树', '花', '汽车', '飞机',
      '太阳', '月亮', '星星', '彩虹', '蝴蝶', '鸟',
      '人物', '动物', '植物', '建筑', '风景'
    ];

    const lowerInput = userInput.toLowerCase();
    
    // Check if user mentions drawing
    const hasDrawingIntent = drawingKeywords.some(keyword => 
      lowerInput.includes(keyword)
    );

    if (!hasDrawingIntent) {
      return null;
    }

    // Extract what they want to draw
    for (const obj of objectKeywords) {
      if (lowerInput.includes(obj)) {
        return obj;
      }
    }

    // Use simple pattern matching for common phrases
    const patterns = [
      /画.*?([^\s，。！？]+)/g,
      /想画.*?([^\s，。！？]+)/g,
      /不会画.*?([^\s，。！？]+)/g
    ];

    for (const pattern of patterns) {
      const matches = lowerInput.match(pattern);
      if (matches && matches.length > 0) {
        // Extract the object from the match
        const match = matches[0];
        const obj = match.replace(/画|想|不会/g, '').trim();
        if (obj && obj.length > 0) {
          return obj;
        }
      }
    }

    return '绘画参考';
  }
}

// Global instance
window.imageSearchService = new ImageSearchService();