// AI Service utilities for image analysis and story generation
const API_BASE_URL = 'http://localhost:3000/api';

async function analyzeImage(imageFile, sessionId) {
  console.log('🔍 开始上传和分析图片...');
  
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('sessionId', sessionId);
  
  const response = await fetch(`${API_BASE_URL}/upload-image`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`图片上传失败: ${response.status} ${errorText}`);
  }
  
  const result = await response.json();
  console.log('✅ 图片分析完成:', result);
  
  return {
    filename: result.filename,
    url: result.url,
    description: result.analysis.description,
    objects: ['画中的元素'], // 简化，实际可从description中提取
    colors: ['多彩的颜色'],
    mood: '充满想象力',
    scene: '有趣的画面',
    confidence: 0.9,
    storyPrompt: generateQuestionFromDescription(result.analysis.description)
  };
}

function generateQuestionFromDescription(description) {
  // 基于AI分析生成初始问题
  const questions = [
    '这幅画真棒！你能告诉我画中发生了什么有趣的事情吗？',
    '我看到你的画很有创意，能和我分享一下这幅画背后的故事吗？',
    '这个画面看起来很有意思，谁是这个故事的主角呢？',
    '你的画充满了想象力！这里发生了什么事情？',
    '能告诉我这幅画里最喜欢的部分是什么吗？'
  ];
  
  return questions[Math.floor(Math.random() * questions.length)];
}

async function generateInitialQuestion(imageAnalysis) {
  // 使用分析结果中的故事引导
  if (imageAnalysis.storyPrompt) {
    return imageAnalysis.storyPrompt;
  }
  
  return '这幅画真棒！你能告诉我画中发生了什么有趣的事情吗？';
}

async function generateAIResponse(userInput, imageAnalysis, currentStory) {
  // 检查是否提到绘画相关的关键词
  const drawingKeywords = ['画', '绘画', '画画', '不会画', '怎么画', '想画', '要画'];
  const hasDrawingIntent = drawingKeywords.some(keyword => userInput.includes(keyword));
  
  if (hasDrawingIntent) {
    // 提取想要画的对象
    let drawingObject = '小狗';
    if (userInput.includes('小狗')) drawingObject = '小狗';
    else if (userInput.includes('小猫')) drawingObject = '小猫';
    else if (userInput.includes('房子')) drawingObject = '房子';
    else if (userInput.includes('树')) drawingObject = '树';
    else if (userInput.includes('花')) drawingObject = '花';
    else if (userInput.includes('汽车')) drawingObject = '汽车';
    else if (userInput.includes('飞机')) drawingObject = '飞机';
    
    return {
      hasFollowUp: true,
      question: `好的，让我们来看一看${drawingObject}的图片，这些可以帮助你画出更好的${drawingObject}！你可以观察它们的形状、颜色和细节。看完后，你可以继续讲你的故事。`,
      confidence: 0.9,
      suggestions: ['观察参考图片', '学习绘画技巧', '继续故事创作']
    };
  }
  
  // 常规故事引导问题
  const followUpQuestions = [
    '然后发生了什么有趣的事情？',
    '这个角色遇到了什么困难吗？',
    '故事的结局是怎样的？',
    '还有其他角色参与这个故事吗？',
    '这个地方有什么特别之处？',
    '你最喜欢故事中的哪个部分？',
    '如果你是主角，你会怎么做？'
  ];
  
  // 判断故事是否完整（基于长度的简单逻辑）
  const storyLength = currentStory.length + userInput.length;
  const hasFollowUp = storyLength < 300; // 如果故事较短则继续
  
  return {
    hasFollowUp,
    question: hasFollowUp ? followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)] : null,
    confidence: 0.9,
    suggestions: hasFollowUp ? ['继续描述情节', '添加更多细节', '介绍新角色'] : ['完善结局', '总结故事']
  };
}
