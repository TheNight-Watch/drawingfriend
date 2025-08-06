import { env } from 'bun';

const STEPFUN_API_URL = 'https://api.stepfun.com/v1/chat/completions';
const API_KEY = env.STEPFUN_API_KEY;

if (!API_KEY) {
  throw new Error('STEPFUN_API_KEY environment variable is required');
}

export async function analyzeImage(imagePath: string) {
  const prompt = `
请分析这幅儿童绘画，重点关注：
1. 画中的主要物体和角色
2. 使用的颜色和绘画风格  
3. 可能表达的情感或故事
4. 适合展开的故事方向

请用简单、积极的语言描述，适合与4-6岁儿童对话。
  `.trim();

  // 读取图片文件并转换为base64
  const imageFile = Bun.file(imagePath);
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString('base64');
  
  // 根据文件扩展名确定MIME类型
  const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  console.log(`🔍 使用base64编码分析图片: ${imagePath}`);

  const response = await fetch(STEPFUN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'step-1o-turbo-vision',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API错误详情:', errorText);
    throw new Error(`阶跃星辰API错误: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
} 