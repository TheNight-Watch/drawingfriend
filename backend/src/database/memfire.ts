import { env } from 'bun';

// Memfire (Supabase) 配置
const MEMFIRE_URL = env.MEMFIRE_URL || 'https://your-project.memfiredb.com';
const MEMFIRE_ANON_KEY = env.MEMFIRE_ANON_KEY || 'your-anon-key';
const MEMFIRE_SERVICE_KEY = env.MEMFIRE_SERVICE_KEY || 'your-service-key';

// 检查必要的环境变量
if (!MEMFIRE_URL || MEMFIRE_URL === 'https://your-project.memfiredb.com') {
  console.warn('⚠️ MEMFIRE_URL environment variable not set');
}

if (!MEMFIRE_ANON_KEY || MEMFIRE_ANON_KEY === 'your-anon-key') {
  console.warn('⚠️ MEMFIRE_ANON_KEY environment variable not set');
}

// Supabase客户端类
class MemfireClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(useServiceKey = false) {
    this.baseUrl = `${MEMFIRE_URL}/rest/v1`;
    this.headers = {
      'apikey': useServiceKey ? MEMFIRE_SERVICE_KEY : MEMFIRE_ANON_KEY,
      'Authorization': `Bearer ${useServiceKey ? MEMFIRE_SERVICE_KEY : MEMFIRE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // 通用查询方法
  async query(table: string, options: {
    select?: string;
    filter?: Record<string, any>;
    order?: string;
    limit?: number;
  } = {}) {
    try {
      const url = new URL(`${this.baseUrl}/${table}`);
      
      if (options.select) {
        url.searchParams.set('select', options.select);
      }
      
      if (options.filter) {
        for (const [key, value] of Object.entries(options.filter)) {
          url.searchParams.set(key, `eq.${value}`);
        }
      }
      
      if (options.order) {
        url.searchParams.set('order', options.order);
      }
      
      if (options.limit) {
        url.searchParams.set('limit', options.limit.toString());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Query ${table} failed:`, error);
      throw error;
    }
  }

  // 插入数据
  async insert(table: string, data: any) {
    try {
      const response = await fetch(`${this.baseUrl}/${table}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Insert failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Insert into ${table} failed:`, error);
      throw error;
    }
  }

  // 更新数据
  async update(table: string, filter: Record<string, any>, data: any) {
    try {
      const url = new URL(`${this.baseUrl}/${table}`);
      
      for (const [key, value] of Object.entries(filter)) {
        url.searchParams.set(key, `eq.${value}`);
      }

      const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Update failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Update ${table} failed:`, error);
      throw error;
    }
  }

  // 删除数据
  async delete(table: string, filter: Record<string, any>) {
    try {
      const url = new URL(`${this.baseUrl}/${table}`);
      
      for (const [key, value] of Object.entries(filter)) {
        url.searchParams.set(key, `eq.${value}`);
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Delete from ${table} failed:`, error);
      throw error;
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      const response = await fetch(`${MEMFIRE_URL}/rest/v1/`, {
        method: 'GET',
        headers: this.headers
      });
      
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: MEMFIRE_URL,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 数据模型接口
export interface DrawingSession {
  id?: string;
  user_id?: string;
  image_url: string;
  image_filename: string;
  image_analysis: any;
  story_content?: string;
  conversation_count?: number;
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'completed' | 'abandoned';
}

export interface Conversation {
  id?: string;
  session_id: string;
  user_input: string;
  ai_response: string;
  conversation_type?: 'story' | 'drawing' | 'question';
  audio_url?: string;
  created_at?: string;
}

export interface ImageSearch {
  id?: string;
  session_id: string;
  search_query: string;
  search_results: any[];
  selected_image_id?: string;
  created_at?: string;
}

// 数据访问对象类
export class SessionDAO {
  private client: MemfireClient;

  constructor() {
    this.client = new MemfireClient();
  }

  async createSession(session: Omit<DrawingSession, 'id' | 'created_at' | 'updated_at'>): Promise<DrawingSession[]> {
    const sessionData = {
      ...session,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };

    return await this.client.insert('drawing_sessions', sessionData);
  }

  async getSession(sessionId: string): Promise<DrawingSession | null> {
    const results = await this.client.query('drawing_sessions', {
      filter: { id: sessionId }
    });

    return results[0] || null;
  }

  async updateSession(sessionId: string, data: Partial<DrawingSession>): Promise<DrawingSession[]> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    return await this.client.update('drawing_sessions', { id: sessionId }, updateData);
  }

  async getRecentSessions(limit = 10): Promise<DrawingSession[]> {
    return await this.client.query('drawing_sessions', {
      order: 'created_at.desc',
      limit
    });
  }
}

export class ConversationDAO {
  private client: MemfireClient;

  constructor() {
    this.client = new MemfireClient();
  }

  async addConversation(conversation: Omit<Conversation, 'id' | 'created_at'>): Promise<Conversation[]> {
    const conversationData = {
      ...conversation,
      created_at: new Date().toISOString()
    };

    return await this.client.insert('conversations', conversationData);
  }

  async getSessionConversations(sessionId: string): Promise<Conversation[]> {
    return await this.client.query('conversations', {
      filter: { session_id: sessionId },
      order: 'created_at.asc'
    });
  }

  async getConversationCount(sessionId: string): Promise<number> {
    const conversations = await this.getSessionConversations(sessionId);
    return conversations.length;
  }
}

export class ImageSearchDAO {
  private client: MemfireClient;

  constructor() {
    this.client = new MemfireClient();
  }

  async saveSearch(search: Omit<ImageSearch, 'id' | 'created_at'>): Promise<ImageSearch[]> {
    const searchData = {
      ...search,
      created_at: new Date().toISOString()
    };

    return await this.client.insert('image_searches', searchData);
  }

  async getSessionSearches(sessionId: string): Promise<ImageSearch[]> {
    return await this.client.query('image_searches', {
      filter: { session_id: sessionId },
      order: 'created_at.desc'
    });
  }
}

// 单例实例
export const memfireClient = new MemfireClient();
export const sessionDAO = new SessionDAO();
export const conversationDAO = new ConversationDAO();
export const imageSearchDAO = new ImageSearchDAO();

// 数据库健康检查
export async function checkDatabaseHealth() {
  return await memfireClient.healthCheck();
}