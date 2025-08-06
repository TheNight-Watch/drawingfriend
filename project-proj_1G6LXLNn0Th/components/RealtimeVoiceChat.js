function RealtimeVoiceChat({ onTranscript, onAIResponse, imageAnalysis, isProcessing, setIsProcessing, sessionId, onReady }) {
  try {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [connectionError, setConnectionError] = React.useState('');
    const [librariesLoaded, setLibrariesLoaded] = React.useState(false);
    const [conversationalMode, setConversationalMode] = React.useState('realtime'); // 'manual' 或 'realtime'
    
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
          
          // 如果是实时模式，自动开始录音
          if (conversationalMode === 'realtime') {
            console.log('🎤 实时模式，自动开始录音');
            await wavRecorderRef.current.record(data => clientRef.current?.appendInputAudio(data.mono));
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
        
        // 设置初始会话配置
        client.updateSession({
          instructions: '你是一个友善的AI助手，专门与4-6岁的儿童对话。你正在帮助他们基于他们的绘画创作有趣的故事。请使用简单、积极的语言，提出引导性的问题来激发他们的想象力。',
          voice: 'jingdiannvsheng',
          turn_detection: conversationalMode === 'realtime' ? { type: 'server_vad' } : null,
          input_audio_transcription: { model: 'whisper-1' }
        });

        if (onReady) {
          onReady();
        }
      });

      // 监听所有实时事件，从中捕获session.created
      client.on('realtime.event', ({ source, event }) => {
        if (source === 'server' && event.type === 'session.created') {
          console.log('✅ 会话创建成功，连接已建立');
          setIsConnected(true);
          setConnectionError('');
          
          if (onReady) {
            onReady();
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

      // 播放状态事件
      client.on('realtime.response.audio_transcript.delta', () => {
        setIsSpeaking(true);
      });

      client.on('realtime.response.audio.done', () => {
        setIsSpeaking(false);
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

              {imageAnalysis && (
                <div className="text-xs text-[var(--text-secondary)] bg-[var(--background-light)] p-3 rounded">
                  💡 基于你的画作：{imageAnalysis.description || '正在分析中...'}
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
