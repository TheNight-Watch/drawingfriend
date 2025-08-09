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
              'theme-setting': montessoriPrinciples + `你是"故事精灵"，与4-6岁儿童对话。
任务：了解孩子想画什么主题。
开场：直接询问"小朋友，你有想画的主题吗？"
如果有主题：回复"好的，那我们开始创作吧！"
如果没有主题：引导观察周围环境，问"你在这里看到了什么？"`,
              
              'guidance': montessoriPrinciples + `你是"故事精灵"，帮助孩子绘画。
当孩子说"不会画XXX"时：先问"你见过[物品]吗？感觉怎么样？"再提供图片。
图片搜索格式："我们一起看看[物品]吧！[SEARCH:物品]"
当孩子说"没想法"时：问"看看周围，有什么吸引你的吗？"`,
              
              'story': montessoriPrinciples + `你是"故事精灵"，与孩子聊他们的画作。
开场："你画的是什么故事呢？和我分享一下吧！"
互动方式：描述你看到的颜色和形状，问开放式问题。
避免：不要解读画面含义，不要说"太棒了"。`
            };
            
            return baseInstructions[mode] || baseInstructions['story'];
          };
          
          console.log('📋 正在设置AI系统提示词，模式:', mode);
          clientRef.current.updateSession({
            instructions: getInstructionsByMode(mode),
            voice: 'jingdiannvsheng',
            turn_detection: conversationalMode === 'realtime' ? { type: 'server_vad' } : null,
            input_audio_transcription: { model: 'whisper-1' }
          });
          
          console.log('✅ 系统提示词设置完成');
          setIsConnected(true);
          setConnectionError('');
          
          if (onReady) {
            onReady();
          }
          
          // 根据模式决定是否发送初始问候
          if (mode === 'story') {
            // 只有在故事模式下才发送基于画作的个性化问候
            setTimeout(() => {
              sendInitialGreeting();
            }, 1000);
          } else if (mode === 'theme-setting') {
            // 主题设置模式下发送主题询问
            setTimeout(() => {
              sendThemeSettingGreeting();
            }, 1000);
          } else if (mode === 'guidance') {
            // 引导模式下发送引导问候
            setTimeout(() => {
              sendGuidanceGreeting();
            }, 1000);
          }
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

      // 对话事件
      client.on('conversation.updated', ({ item, delta }) => {
        if (delta?.transcript) {
          if (onTranscript) {
            onTranscript(delta.transcript);
          }
        }
        
        if (delta?.audio) {
          wavPlayerRef.current.add16BitPCM(delta.audio, item.id);
        }
        
        if (item.status === 'completed' && item.formatted?.text) {
          if (onAIResponse) {
            onAIResponse(item.formatted.text);
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

      // 🎯 监听AI回复完成事件 - 从response.done中提取transcript
      client.on('response.done', (event) => {
        console.log('🔥🔥🔥 【DEBUG】收到response.done事件:', event);
        
        // 从response.output中提取transcript
        // 数据结构: event.response.output[0].content[0].transcript
        const output = event.response?.output;
        console.log('🔥🔥🔥 【DEBUG】output:', output);
        
        if (output && output.length > 0) {
          const messageContent = output[0]?.content;
          console.log('🔥🔥🔥 【DEBUG】messageContent:', messageContent);
          
          if (messageContent && messageContent.length > 0) {
            const audioContent = messageContent.find(content => content.type === 'audio');
            console.log('🔥🔥🔥 【DEBUG】audioContent:', audioContent);
            
            if (audioContent && audioContent.transcript) {
              const transcript = audioContent.transcript;
              console.log('🔥🔥🔥 【DEBUG】提取到的transcript:', transcript);
              console.log('🔥🔥🔥 【DEBUG】开始检测搜索关键词...');
              
              // 🔍 检测搜索触发词并处理
              const cleanedText = detectAndTriggerSearch(transcript);
              
              console.log('🔥🔥🔥 【DEBUG】清理后的文本:', cleanedText);
              
              // 传递清理后的文本给父组件
              if (onAIResponse) {
                onAIResponse(cleanedText);
              }
            } else {
              console.log('🔥🔥🔥 【DEBUG】没有找到audioContent或transcript');
            }
          } else {
            console.log('🔥🔥🔥 【DEBUG】messageContent为空');
          }
        } else {
          console.log('🔥🔥🔥 【DEBUG】output为空');
        }
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

      // 🚨 额外调试：监听conversation事件  
      client.on('conversation.updated', ({ item, delta }) => {
        console.log('💬 【对话更新】item:', item, 'delta:', delta);
        
        if (item && item.formatted && item.formatted.transcript) {
          const transcript = item.formatted.transcript;
          console.log('🗣️ 【AI输出文本】:', transcript);
          
          // 🔍 检测关键词并触发搜索 - 只在item状态为completed且未处理过时触发
          if (item.role === 'assistant' && 
              item.status === 'completed' && 
              transcript.includes('[SEARCH:') &&
              item.id !== lastProcessedItemId) {
            
            console.log('🎯 【检测到搜索关键词】开始处理:', transcript);
            console.log('🎯 【Item ID】:', item.id, '【上次处理的ID】:', lastProcessedItemId);
            
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
            } else {
              console.log('⚠️ 【重复关键词】已处理过，跳过搜索');
            }
            
            // 清理文本并传递给父组件
            const cleanedText = transcript.replace(searchPattern, '');
            if (onAIResponse) {
              onAIResponse(cleanedText);
            }
          }
        }
        
        if (delta && delta.transcript) {
          console.log('📝 【增量文本】:', delta.transcript);
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


    // 🤖 根据模式生成不同的初始消息（恢复预设开场白）
    const generateInitialPrompt = () => {
      switch (mode) {
        case 'theme-setting':
          return '请直接询问小朋友："小朋友，你有想画的主题吗？"保持简洁回复。';
          
        case 'guidance':
          return '请问候小朋友："你好，小朋友！我是故事精灵，有什么需要我帮助的吗？"';
          
        case 'story':
        default:
          const imageContent = imageAnalysis?.description || '一幅美丽的画作';
          return `请邀请孩子分享画作。看到画作内容："${imageContent}"
直接说："你画的是什么故事呢？和我分享一下吧！"`;
      }
    };

    // 发送主题设置问候消息
    const sendThemeSettingGreeting = async () => {
      if (!clientRef.current || hasInitiatedGreeting) {
        return;
      }

      try {
        console.log('🎨 发送主题设置问候消息');
        
        clientRef.current.sendUserMessageContent([
          {
            type: 'input_text',
            text: '请直接询问："小朋友，你有想画的主题吗？"'
          }
        ]);
        
        setHasInitiatedGreeting(true);
        
        if (onAIResponse) {
          onAIResponse('AI正在询问绘画主题...');
        }
      } catch (error) {
        console.error('❌ 发送主题设置问候失败:', error);
      }
    };

    // 发送引导问候消息
    const sendGuidanceGreeting = async () => {
      if (!clientRef.current || hasInitiatedGreeting) {
        return;
      }

      try {
        console.log('🤝 发送引导问候消息');
        
        clientRef.current.sendUserMessageContent([
          {
            type: 'input_text',
            text: '请问候："你好，小朋友！我是故事精灵，有什么需要我帮助的吗？"'
          }
        ]);
        
        setHasInitiatedGreeting(true);
        
        if (onAIResponse) {
          onAIResponse('AI绘画助手已准备好帮助你...');
        }
      } catch (error) {
        console.error('❌ 发送引导问候失败:', error);
      }
    };

    // 发送初始问候消息
    const sendInitialGreeting = async () => {
      if (!clientRef.current || hasInitiatedGreeting) {
        return;
      }

      try {
        const initialPrompt = generateInitialPrompt();
        console.log('🤖 AI将发送初始问候，模式:', mode);
        console.log('📝 初始提示:', initialPrompt);
        
        // 发送初始消息
        clientRef.current.sendUserMessageContent([
          {
            type: 'input_text',
            text: initialPrompt
          }
        ]);
        
        setHasInitiatedGreeting(true);
        
        if (onAIResponse) {
          const loadingMessage = mode === 'theme-setting' 
            ? 'AI正在询问绘画主题...' 
            : mode === 'guidance' 
            ? 'AI正在准备为你提供绘画指导...'
            : 'AI正在邀请你分享画面的故事...';
          onAIResponse(loadingMessage);
        }
      } catch (error) {
        console.error('❌ 发送初始问候失败:', error);
      }
    };

    // 🔍 检测搜索触发词函数
    const detectAndTriggerSearch = (fullTranscript) => {
      console.log('🔍 检测函数输入文本:', fullTranscript);
      
      const searchPattern = /\[SEARCH:([^\]]+)\]/g;
      let match;
      let foundKeywords = [];
      
      console.log('🔍 开始正则匹配...');
      while ((match = searchPattern.exec(fullTranscript)) !== null) {
        const keyword = match[1].trim();
        foundKeywords.push(keyword);
        console.log('✅ 检测到搜索触发词:', keyword);
      }
      
      console.log('🔍 匹配结果:', foundKeywords);
      
      // 触发搜索
      if (foundKeywords.length > 0) {
        console.log('🚀 准备触发图片搜索:', foundKeywords[0]);
        triggerImageSearch(foundKeywords[0]);
      } else {
        console.log('❌ 未找到搜索触发词');
      }
      
      // 移除搜索标记，返回清理后的文本
      const cleanedText = fullTranscript.replace(searchPattern, '');
      console.log('🧹 文本清理完成:', cleanedText);
      return cleanedText;
    };

    // 🖼️ 图片搜索函数
    const triggerImageSearch = async (keyword) => {
      setIsSearching(true);
      setSearchKeyword(keyword);
      
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

              {/* 🖼️ 图片搜索结果展示 */}
              {(searchImages.length > 0 || isSearching) && (
                <div className="bg-white p-4 rounded-lg border-2 border-[var(--primary-color)] shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[var(--primary-color)]">
                      📸 参考图片 {searchKeyword && `- ${searchKeyword}`}
                    </h3>
                    {searchImages.length > 0 && (
                      <button 
                        onClick={() => {
                          setSearchImages([]);
                          setSearchKeyword('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        ✕ 关闭
                      </button>
                    )}
                  </div>
                  
                  {isSearching ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-color)] mx-auto mb-2"></div>
                      <p className="text-sm text-[var(--text-secondary)]">正在搜索图片...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {searchImages.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <img 
                            src={image.url} 
                            alt={image.alt}
                            className="w-full h-24 object-cover rounded-lg border hover:border-[var(--primary-color)] transition-all duration-200 cursor-pointer"
                            onClick={() => {
                              // 可以添加图片点击查看大图功能
                              window.open(image.photographer_url, '_blank');
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            📷 {image.photographer}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchImages.length > 0 && (
                    <div className="mt-3 text-xs text-[var(--text-secondary)] text-center">
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
