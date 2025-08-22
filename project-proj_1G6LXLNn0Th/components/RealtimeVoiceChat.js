function RealtimeVoiceChat({ onTranscript, onAIResponse, imageAnalysis, isProcessing, setIsProcessing, sessionId, onReady, mode = 'story' }) {
  try {
    // 状态管理
    const [isConnected, setIsConnected] = React.useState(false);
    const [connectionError, setConnectionError] = React.useState('');
    const [isRecording, setIsRecording] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [hasInitiatedGreeting, setHasInitiatedGreeting] = React.useState(false);
    const [librariesLoaded, setLibrariesLoaded] = React.useState(false);
    const [conversationalMode, setConversationalMode] = React.useState('realtime'); // 'manual' 或 'realtime'
    
    // 🖼️ 图片搜索功能状态
    const [searchImages, setSearchImages] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchKeyword, setSearchKeyword] = React.useState('');
    const [aiResponseBuffer, setAiResponseBuffer] = React.useState('');
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // 添加防重复搜索状态
    const [lastProcessedItemId, setLastProcessedItemId] = React.useState('');
    const [processedSearchKeywords, setProcessedSearchKeywords] = React.useState(new Set());
    
    const clientRef = React.useRef(null);
    const wavRecorderRef = React.useRef(null);
    const wavPlayerRef = React.useRef(null);

    // 采样率
    const sampleRate = 24000;

    // 监听库加载事件
    React.useEffect(() => {
      const checkLibraries = () => {
        if (window.RealtimeClient && window.WavRecorder && window.WavStreamPlayer) {
          console.log('✅ 实时语音库检查通过');
          setLibrariesLoaded(true);
          return true;
        }
        return false;
      };

      // 立即检查一次
      if (checkLibraries()) {
        return;
      }

      // 监听库加载完成事件
      const handleLibrariesLoaded = () => {
        console.log('📡 收到库加载完成事件');
        checkLibraries();
      };

      window.addEventListener('realtimeLibrariesLoaded', handleLibrariesLoaded);
      
      // 备用：定时检查（防止事件错过）
      const checkInterval = setInterval(() => {
        if (checkLibraries()) {
          clearInterval(checkInterval);
        }
      }, 100);

      return () => {
        window.removeEventListener('realtimeLibrariesLoaded', handleLibrariesLoaded);
        clearInterval(checkInterval);
      };
    }, []);

    // Initialize Realtime components
    React.useEffect(() => {
      if (!sessionId) {
        console.log('⏳ 等待sessionId...');
        return;
      }

      if (!librariesLoaded) {
        console.log('⏳ 等待实时语音库加载...');
        return;
      }

      const initializeRealtime = async () => {
        try {
          console.log('🎤 开始初始化实时语音服务，sessionId:', sessionId);
          
          const RealtimeClient = window.RealtimeClient;
          const WavRecorder = window.WavRecorder;
          const WavStreamPlayer = window.WavStreamPlayer;

          // 按照Step-Realtime-Console的方式初始化
          // WebSocket代理URL，包含sessionId参数
          let wsProxyUrl = `ws://localhost:8082?sessionId=${sessionId}&model=step-1o-audio`;
          
          console.log('🔗 连接WebSocket代理:', wsProxyUrl);
          
          // 创建客户端（连接到你的WebSocket代理服务器）
          clientRef.current = new RealtimeClient({ 
            url: wsProxyUrl,
            apiKey: 'dummy-key', // 真实密钥由后端代理处理
            dangerouslyAllowAPIKeyInBrowser: true,
            debug: true
          });

          // 初始化音频组件
          wavRecorderRef.current = new WavRecorder({ 
            sampleRate: sampleRate 
          });
          
          wavPlayerRef.current = new WavStreamPlayer({ 
            sampleRate: sampleRate 
          });

          // 设置事件处理器
          setupEventHandlers();

          // 初始化音频组件
          await wavRecorderRef.current.begin();
          await wavPlayerRef.current.connect();
          
          // 连接客户端
          await clientRef.current.connect();
          
          console.log('✅ 实时语音客户端连接成功');
          setConnectionError(''); // 清除错误信息
          setIsConnected(true); // 直接设置连接状态
          
          // 如果是实时模式，在问候消息发送后自动开始录音
          if (conversationalMode === 'realtime') {
            console.log('🎤 实时模式，等待问候消息发送后开始录音');
            setTimeout(async () => {
              if (wavRecorderRef.current && clientRef.current) {
                try {
                  // 检查录音器状态，如果正在录音则先停止
                  const currentStatus = wavRecorderRef.current.getStatus();
                  console.log('🔍 当前录音器状态:', currentStatus);
                  
                  if (currentStatus === 'recording') {
                    console.log('⏸️ 录音器正在录制，先停止');
                    await wavRecorderRef.current.pause();
                  }
                  
                  // 开始新的录音
                  await wavRecorderRef.current.record(data => clientRef.current?.appendInputAudio(data.mono));
                  console.log('🎤 实时录音已开始');
                } catch (error) {
                  console.error('❌ 录制启动失败:', error.message);
                  // 如果是已经在录制的错误，尝试先停止再重新开始
                  if (error.message.includes('Already recording')) {
                    try {
                      await wavRecorderRef.current.pause();
                      await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms
                      await wavRecorderRef.current.record(data => clientRef.current?.appendInputAudio(data.mono));
                      console.log('🎤 重新启动录音成功');
                    } catch (retryError) {
                      console.error('❌ 重新启动录音失败:', retryError.message);
                    }
                  }
                }
              }
            }, 2000); // 给问候消息更多时间
          }
          
        } catch (error) {
          console.error('❌ 实时语音服务初始化失败:', error);
          setConnectionError('实时语音服务初始化失败：' + error.message);
        }
      };

      initializeRealtime();

      return () => {
        console.log('🧹 清理实时语音组件');
        if (clientRef.current) {
          clientRef.current.disconnect();
        }
        if (wavRecorderRef.current) {
          wavRecorderRef.current.end();
        }
        if (wavPlayerRef.current) {
          wavPlayerRef.current.interrupt();
        }
      };
    }, [sessionId, librariesLoaded]); // 依赖sessionId和librariesLoaded

    const setupEventHandlers = () => {
      const client = clientRef.current;
      
      // 连接事件
      client.on('realtime.connecting', () => {
        console.log('🔄 正在连接到实时语音API...');
        setConnectionError('');
      });

      client.on('realtime.connected', () => {
        console.log('✅ 实时语音API连接成功');
        setIsConnected(true);
        setConnectionError('');
        
        if (onReady) {
          onReady();
        }
      });

      // 监听所有实时事件，从中捕获session.created
      client.on('realtime.event', ({ source, event }) => {
        if (source === 'server' && event.type === 'session.created') {
          console.log('✅ 会话创建成功，连接已建立');
          
          // 🎯 根据mode设置不同的AI系统提示词（集成蒙氏教育原则）
          const getInstructionsByMode = (mode) => {
            // 🌟 简化的蒙氏引导原则
            const montessoriPrinciples = `核心原则：尊重孩子个体性，激发内在动机，关注过程而非结果。
语言要求：开放式提问，描述性反馈，简洁回复（每次1-2句话）。
避免：过度赞美，强加解读，长篇说教。
`;

            const baseInstructions = {
              'theme-setting': montessoriPrinciples + `你是一个画画玩伴，连接建立后立即开始按以下步骤执行：

【第一步：自我介绍】（连接建立后立即执行）
- 说："嗨！我是你的画画玩伴！希望能陪你度过一个比平常更快乐的画画时光！"
- 完成后进入第二步

【第二步：了解活动】
在自我介绍后，你需要遵循下面的步骤自然过渡到故事绘画，主要需要随机应变，不用很死板：
先了解体验：你需要了解孩子的经历背景。背景是孩子们中午刚进行完展厅寻宝活动，你可以说"我听说中午有一个展厅寻宝的活动，那个是什么呀？听起来很有趣呢！"
让孩子描述：你需要引导孩子描述他觉得最有趣的事情
发现兴趣点：你需要巧妙的鼓励孩子把他想到的东西画出来，比如"哎呀，我突然想到，我们可以把这些画下来诶！"


【执行规则】
- 连接建立后立即开始第一步，不等待用户输入

【应急情况】
如果孩子直接说要画画：立即说"太好了！那我们开始画一个你想画的故事吧！"
如果孩子不想聊天：说"没关系，你可以先在白纸上自由的涂鸦，说不定突然就有灵感来了呢，我会一直在旁边陪着你！"

现在立即开始第一步。`,
              
              'guidance': montessoriPrinciples + `你是一个画画玩伴，专门帮助遇到困难的小朋友。连接建立后立即主动询问孩子需要什么帮助。

【开场方式】（连接建立后立即执行）
说："你好呀！我是你的画画玩伴，有什么画不出来的地方吗？我来帮帮你！"

【核心任务】智能识别孩子遇到的困难类型并给出相应帮助

【困难类型识别】

🎨 **情况1：没有思路型**
识别信号：
- "我不知道画什么"
- "没有想法"
- "想不出来"
- "不知道画啥"

应对策略：
1. 温暖鼓励："没关系呀，我们一起想想！"
2. 启发想象："你今天做了什么好玩的事情？"或"你最喜欢什么呀？"
3. 具体引导："那个听起来很有意思！我们可以把它画下来吗？"
4. 降低门槛："或者我们先随便画几笔，看看能变成什么？"

🖌️ **情况2：技能困难型**  
识别信号：
- "我不会画XXX"
- "XXX太难了"
- "画不出来XXX"
- "不知道XXX怎么画"

应对策略：
1. 共情理解："画[物品]确实有点挑战呢！"
2. 观察引导："你平时见过[物品]吗？它是什么样子的？"
3. 视觉辅助：**必须**使用搜索格式："我们一起看看[物品]吧！[SEARCH:物品]"
4. 降低难度："我们可以先画个简单的版本！"

【语言风格要求】
- 多用问句激发思考，少用陈述句
- 保持好奇和惊喜的语调
- 每次回复1-2句话，简洁有力
- 根据孩子的能量状态调整互动方式

【实例模板】

没思路时：
"哎呀，想不出来画什么是很正常的呀！那你今天有什么开心的事情吗？"

画不出来时：
"画小狗确实有点难呢！你见过小狗吗？它的耳朵是什么样子的？我们一起看看小狗吧！[SEARCH:小狗]"

【注意事项】
- 不要直接告诉孩子怎么画，而是引导他们观察和思考
- 搜索格式必须准确：[SEARCH:具体物品名称]
- 保持耐心，允许孩子慢慢来
- 每个孩子都不一样，灵活调整方式`,
              
              'story': montessoriPrinciples + `你是一个故事引导玩伴，帮助孩子将画作发展成完整的故事。连接建立后立即开始引导对话。

【最终目标】引导孩子思考，将零散思维串联成完整、有逻辑的故事，并表达出来。

${imageAnalysis ? `【图片分析结果】
AI分析：${imageAnalysis.description || '一幅有趣的作品'}

` : ''}【开场方式】（连接建立后立即执行）
基于图片分析结果，你需要先讲你的推测的故事

【故事构建步骤】

🎯 **第一阶段：了解基础**
- 让孩子自由描述画面："你能告诉我画里发生了什么吗？"
- 倾听并确认关键元素："我看到了[从图片分析中提取的元素]，是这样吗？"

🌟 **第二阶段：发散细节**
围绕画面内容提出开放性问题：
- 环境背景："这个故事发生在什么地方呀？"
- 主角动机："[主角]想要做什么呢？"
- 其他角色："还有其他人物在这个故事里吗？"
- 情感氛围："[主角]现在的心情怎么样？"

🎨 **第三阶段：完善故事**
引导逻辑连接：
- 起因："这个故事是怎么开始的呢？"
- 过程："然后发生了什么？"
- 结果："最后会怎么样呢？"
- 意义："这个故事想告诉我们什么？"

【引导策略】

基于图片分析结果的个性化引导：
- 如果画面有动物：询问动物的性格、想做什么
- 如果画面有人物：询问人物关系、在做什么
- 如果画面有场景：询问时间、季节、氛围
- 如果画面有物品：询问物品的作用、来历

【语言技巧】

1. **描述性反馈**：
"我注意到你画的[具体元素]，看起来很[描述感受]"

2. **开放式提问**：
"你觉得[角色]为什么会[行为]？"
"如果你是[角色]，你会怎么办？"

3. **故事连接**：
"这听起来很有意思！然后呢？"
"哦，所以[角色]是因为[原因]才[行为]的？"

4. **想象激发**：
"你觉得在[场景]里还会有什么？"
"[角色]的朋友可能是谁呢？"

【注意事项】
- 每次只问一个问题，等孩子回答后再继续
- 基于孩子的回答调整问题方向
- 不要强加自己的理解，让孩子主导故事内容
- 经常总结和确认："所以这个故事是..."
- 保持好奇和惊喜的语调，鼓励孩子的创意

【完成标志】
当孩子能完整讲述包含背景、角色、情节、结果的故事时，给予肯定：

现在根据图片分析结果开始引导对话。`,
            };
            
            return baseInstructions[mode] || baseInstructions['story'];
          };
          
          console.log('📋 正在设置AI系统提示词，模式:', mode);
          clientRef.current.updateSession({
            instructions: getInstructionsByMode(mode),
            voice: 'jingdiannvsheng',
            turn_detection: conversationalMode === 'realtime' ? { type: 'server_vad' } : null
          });
          
          console.log('✅ 系统提示词设置完成');
          setIsConnected(true);
          setConnectionError('');
          
          if (onReady) {
            onReady();
          }
          
          // 发送一个简单的触发消息，让AI开始按照系统指令执行
          // 不包含任何具体指令，纯粹作为启动信号
          setTimeout(() => {
            if (clientRef.current) {
              clientRef.current.sendUserMessageContent([{
                type: 'input_text',
                text: '开始'
              }]);
              console.log('✅ 已发送启动信号，AI将按照系统指令自主执行');
            }
          }, 500);
        }
      });

      client.on('realtime.disconnected', () => {
        console.log('🔌 实时语音API连接断开');
        setIsConnected(false);
      });

      client.on('error', (event) => {
        console.error('❌ 实时语音API错误:', event);
        setConnectionError('连接错误：' + (event.error?.message || '未知错误'));
        setIsConnected(false);
      });

      // VAD模式下，检测到用户说话时，使AI停止说话
      client.on('conversation.interrupted', async () => {
        console.log('🛑 检测到用户说话，中断AI回复');
        const trackSampleOffset = wavPlayerRef.current.interrupt();
        if (trackSampleOffset?.trackId) {
          const { trackId, offset } = trackSampleOffset;
          client.cancelResponse(trackId, offset);
        }
        setIsSpeaking(false);
      });

      // 对话事件 - 统一处理所有conversation.updated事件
      client.on('conversation.updated', ({ item, delta }) => {
        console.log('💬 【对话更新】item:', item, 'delta:', delta);
        
        // 处理用户输入的转录
        if (delta?.transcript && item?.role === 'user') {
          console.log('👤 【用户输入转录】:', delta.transcript);
          if (onTranscript) {
            onTranscript(delta.transcript);
          }
        }
        
        // 处理AI输出的增量转录（仅用于调试）
        if (delta?.transcript && item?.role === 'assistant') {
          console.log('🤖 【AI输出转录】:', delta.transcript);
        }
        
        // 处理音频数据
        if (delta?.audio) {
          wavPlayerRef.current.add16BitPCM(delta.audio, item.id);
        }
        
        // 处理AI完成的回复并检测搜索关键词
        if (item?.role === 'assistant' && item.status === 'completed' && item.formatted?.transcript) {
          const transcript = item.formatted.transcript;
          console.log('🗣️ 【AI完整输出】:', transcript);
          
          // 🔍 检测关键词并触发搜索 - 只在未处理过时触发
          if (transcript.includes('[SEARCH:') && item.id !== lastProcessedItemId) {
            console.log('🎯 【检测到搜索关键词】开始处理:', transcript);
            
            // 更新已处理的item ID
            setLastProcessedItemId(item.id);
            
            // 提取搜索关键词
            const searchPattern = /\[SEARCH:([^\]]+)\]/g;
            let match;
            const foundKeywords = [];
            
            while ((match = searchPattern.exec(transcript)) !== null) {
              const keyword = match[1].trim();
              foundKeywords.push(keyword);
            }
            
            // 只处理未搜索过的关键词
            const newKeywords = foundKeywords.filter(keyword => !processedSearchKeywords.has(keyword));
            
            if (newKeywords.length > 0) {
              console.log('🚀 【新关键词】:', newKeywords);
              
              // 标记关键词为已处理
              const updatedKeywords = new Set(processedSearchKeywords);
              newKeywords.forEach(keyword => updatedKeywords.add(keyword));
              setProcessedSearchKeywords(updatedKeywords);
              
              // 只触发第一个新关键词的搜索
              triggerImageSearch(newKeywords[0]);
            }
            
            // 清理文本并传递给父组件
            const cleanedText = transcript.replace(searchPattern, '');
            if (onAIResponse) {
              onAIResponse(cleanedText);
            }
          } else if (item.formatted?.text) {
            // 普通AI回复
            if (onAIResponse) {
              onAIResponse(item.formatted.text);
            }
          }
        }
      });

      // 录制状态事件
      client.on('realtime.input_audio_buffer.speech_started', () => {
        console.log('🎤 开始录制语音');
        setIsRecording(true);
      });

      client.on('realtime.input_audio_buffer.speech_stopped', () => {
        console.log('🎤 停止录制语音');
        setIsRecording(false);
      });



      // 🎤 监听AI说话状态
      client.on('response.audio.delta', (event) => {
        setIsSpeaking(true);
      });

      client.on('response.audio.done', (event) => {
        setIsSpeaking(false);
      });

      // 🚨 额外调试：监听所有realtime事件
      client.on('realtime.event', ({ source, event }) => {
        if (source === 'server') {
          console.log('📡 【REALTIME事件】类型:', event.type, '事件:', event);
          
          // 专门监听response相关事件
          if (event.type.startsWith('response.')) {
            console.log('🤖 【AI响应事件】:', event.type, event);
          }
        }
      });

      // 🚨 万能调试：监听所有可能的事件
      console.log('🎯 开始注册所有事件监听器...');
      
      // 监听所有可能包含transcript的事件
      const eventTypes = [
        'response.created',
        'response.done', 
        'response.output_item.added',
        'response.output_item.done',
        'response.content_part.added',
        'response.content_part.done',
        'response.audio_transcript.delta',
        'response.audio_transcript.done'
      ];
      
      eventTypes.forEach(eventType => {
        client.on(eventType, (event) => {
          console.log(`🎪 【${eventType}】:`, event);
          
          // 查找任何可能的transcript字段
          const searchForTranscript = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return;
            
            Object.keys(obj).forEach(key => {
              const value = obj[key];
              const currentPath = path ? `${path}.${key}` : key;
              
              if (key === 'transcript' && typeof value === 'string') {
                console.log(`🎯 【找到transcript】路径: ${currentPath}, 内容: "${value}"`);
              } else if (typeof value === 'object') {
                searchForTranscript(value, currentPath);
              }
            });
          };
          
          searchForTranscript(event);
        });
      });
    };

    const startRecording = async () => {
      if (!isConnected || !clientRef.current || !wavRecorderRef.current) {
        console.warn('⚠️ 实时语音服务未准备好');
        return;
      }

      try {
        console.log('🎤 开始录制音频');
        await wavRecorderRef.current.record((data) => {
          clientRef.current.appendInputAudio(data.mono);
        });
        setIsRecording(true);
      } catch (error) {
        console.error('❌ 录制启动失败:', error);
        setConnectionError('录制启动失败：' + error.message);
      }
    };

    const stopRecording = async () => {
      if (!wavRecorderRef.current) {
        return;
      }

      try {
        console.log('🛑 停止录制音频');
        await wavRecorderRef.current.pause();
        setIsRecording(false);
        
        if (clientRef.current) {
          clientRef.current.createResponse();
        }
      } catch (error) {
        console.error('❌ 录制停止失败:', error);
      }
    };

    const interrupt = () => {
      if (clientRef.current) {
        clientRef.current.cancelResponse();
      }
      if (wavPlayerRef.current) {
        wavPlayerRef.current.interrupt();
      }
      setIsSpeaking(false);
    };


    // 🖼️ 图片搜索函数
    const triggerImageSearch = async (keyword) => {
      setIsSearching(true);
      setSearchKeyword(keyword);
      setCurrentImageIndex(0); // 重置轮播图索引
      
      try {
        console.log('🖼️ 开始搜索图片:', keyword);
        
        const response = await fetch(
          `http://localhost:3000/api/search-images?keyword=${encodeURIComponent(keyword)}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.images) {
          setSearchImages(data.images);
          console.log('✅ 图片搜索完成，找到', data.images.length, '张图片');
        } else {
          console.warn('⚠️ 搜索结果为空');
          setSearchImages([]);
        }
        
      } catch (error) {
        console.error('❌ 图片搜索失败:', error);
        setSearchImages([]);
      } finally {
        setIsSearching(false);
      }
    };

    // 切换对话模式
    const toggleConversationalMode = async () => {
      if (!isConnected || !clientRef.current || !wavRecorderRef.current) {
        console.warn('⚠️ 切换模式失败：组件未就绪');
        return;
      }

      try {
        const newMode = conversationalMode === 'manual' ? 'realtime' : 'manual';
        
        // 如果当前在录音，先停止
        if (wavRecorderRef.current.getStatus() === 'recording') {
          await wavRecorderRef.current.pause();
        }
        
        // 更新会话设置
        clientRef.current.updateSession({
          turn_detection: newMode === 'realtime' ? { type: 'server_vad' } : null
        });
        
        // 如果切换到实时模式，自动开始录音
        if (newMode === 'realtime') {
          console.log('🎤 切换到实时模式，开始录音');
          await wavRecorderRef.current.record(data => clientRef.current?.appendInputAudio(data.mono));
        }
        
        setConversationalMode(newMode);
        setIsRecording(false);
        setIsSpeaking(false);
        
        console.log(`🔄 已切换到${newMode === 'realtime' ? '实时' : '手动'}模式`);
      } catch (error) {
        console.error('❌ 模式切换失败:', error);
      }
    };

    // 显示加载状态
    if (!librariesLoaded) {
      return (
        <div className="bg-white p-6 rounded-[var(--border-radius)] shadow-[var(--shadow-soft)] mb-6">
          <div className="text-center">
            <div className="text-[var(--primary-color)] text-lg font-semibold mb-2">
              正在加载实时语音库...
            </div>
            <div className="text-[var(--text-secondary)]">
              请稍候，语音功能正在初始化
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-[var(--border-radius)] shadow-[var(--shadow-soft)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            🎤 实时语音对话
          </h3>
          <div className="flex items-center gap-4">
            {/* 模式切换按钮 */}
            {isConnected && (
              <button
                onClick={toggleConversationalMode}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  conversationalMode === 'realtime' 
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-blue-100 text-blue-700 border border-blue-300'
                }`}
              >
                {conversationalMode === 'realtime' ? '🔄 实时对话' : '🎤 手动录音'}
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-[var(--text-secondary)]">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
        </div>

        {connectionError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>连接错误：</strong>{connectionError}
            <button 
              onClick={() => window.location.reload()} 
              className="ml-2 text-red-600 underline"
            >
              刷新页面
            </button>
          </div>
        )}

        <div className="space-y-4">
          {isConnected ? (
            <>
              {/* 根据模式显示不同的UI */}
              {conversationalMode === 'realtime' ? (
                <div className="text-center">
                  <div className="mb-4">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto transition-all duration-300 ${
                      isSpeaking ? 'bg-green-500 scale-110 animate-pulse' : 
                      isRecording ? 'bg-blue-500 scale-105' : 'bg-gray-400'
                    }`}>
                      {isSpeaking ? '🤖' : isRecording ? '👤' : '💬'}
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-[var(--text-secondary)]">
                    {isSpeaking ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>🤖 AI正在回答...</span>
                        <button 
                          onClick={interrupt}
                          className="text-[var(--primary-color)] underline"
                        >
                          打断
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium text-green-600">🔄 实时对话模式</p>
                        <p>AI会自动检测您的语音并实时回复</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSpeaking || isProcessing}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold transition-all duration-300 ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 scale-110' 
                        : 'bg-[var(--primary-color)] hover:bg-red-400'
                    } ${(isSpeaking || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  >
                    {isRecording ? '🛑' : '🎤'}
                  </button>

                  <div className="text-center text-sm text-[var(--text-secondary)] mt-4">
                    {isSpeaking ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>🤖 AI正在回答...</span>
                        <button 
                          onClick={interrupt}
                          className="text-[var(--primary-color)] underline"
                        >
                          打断
                        </button>
                      </div>
                    ) : isRecording ? (
                      '🎤 正在录制，点击停止'
                    ) : isProcessing ? (
                      '⏳ 处理中...'
                    ) : (
                      '点击麦克风开始对话'
                    )}
                  </div>
                </div>
              )}

              {/* 隐藏详细的画作分析文本显示 */}
              {/* {imageAnalysis && (
                <div className="text-xs text-[var(--text-secondary)] bg-[var(--background-light)] p-3 rounded">
                  💡 基于你的画作：{imageAnalysis.description || '正在分析中...'}
                </div>
              )} */}

              {/* 🖼️ 图片搜索结果展示 - 轮播图形式 */}
              {(searchImages.length > 0 || isSearching) && (
                <div className="bg-white p-4 rounded-lg border-2 border-[var(--primary-color)] shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--primary-color)]">
                      📸 参考图片 {searchKeyword && `- ${searchKeyword}`}
                    </h3>
                    {searchImages.length > 0 && (
                      <button 
                        onClick={() => {
                          setSearchImages([]);
                          setSearchKeyword('');
                          setCurrentImageIndex(0);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        ✕ 关闭
                      </button>
                    )}
                  </div>
                  
                  {isSearching ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
                      <p className="text-lg text-[var(--text-secondary)]">正在搜索图片...</p>
                    </div>
                  ) : searchImages.length > 0 && (
                    <div className="relative">
                      {/* 轮播图主体 */}
                      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={searchImages[currentImageIndex]?.url} 
                          alt={searchImages[currentImageIndex]?.alt}
                          className="w-full h-80 object-cover cursor-pointer transition-opacity duration-300"
                          onClick={() => {
                            window.open(searchImages[currentImageIndex]?.photographer_url, '_blank');
                          }}
                        />
                        
                        {/* 摄影师信息覆盖层 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <p className="text-white text-sm">
                            📷 摄影师：{searchImages[currentImageIndex]?.photographer}
                          </p>
                        </div>
                      </div>
                      
                      {/* 左右切换按钮 */}
                      {searchImages.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex(prev => 
                              prev === 0 ? searchImages.length - 1 : prev - 1
                            )}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex(prev => 
                              prev === searchImages.length - 1 ? 0 : prev + 1
                            )}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                          >
                            →
                          </button>
                        </>
                      )}
                      
                      {/* 底部指示器和缩略图 */}
                      {searchImages.length > 1 && (
                        <div className="mt-4">
                          <div className="flex justify-center gap-2 mb-2">
                            {searchImages.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                                  currentImageIndex === index 
                                    ? 'bg-[var(--primary-color)]' 
                                    : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                              />
                            ))}
                          </div>
                          
                          {/* 缩略图导航 */}
                          <div className="flex justify-center gap-1 overflow-x-auto pb-2">
                            {searchImages.map((image, index) => (
                              <button
                                key={image.id}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all duration-200 ${
                                  currentImageIndex === index 
                                    ? 'border-[var(--primary-color)] scale-110' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                <img 
                                  src={image.url}
                                  alt={image.alt}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                          
                          {/* 计数器 */}
                          <div className="text-center mt-2">
                            <span className="text-sm text-[var(--text-secondary)]">
                              {currentImageIndex + 1} / {searchImages.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {searchImages.length > 0 && (
                    <div className="mt-4 text-xs text-[var(--text-secondary)] text-center">
                      图片来源：Unsplash.com，点击图片查看摄影师主页
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="text-[var(--text-secondary)] mb-2">
                正在连接实时语音服务...
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                会话ID: {sessionId}
              </div>
            </div>
          )}
        </div>
      </div>
    );

  } catch (error) {
    console.error('RealtimeVoiceChat组件错误:', error);
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>组件加载错误：</strong>{error.message}
      </div>
    );
  }
}
