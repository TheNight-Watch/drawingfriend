function RealtimeVoiceChat({ onTranscript, onAIResponse, imageAnalysis, isProcessing, setIsProcessing, sessionId, onReady }) {
  try {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [connectionError, setConnectionError] = React.useState('');
    
    const clientRef = React.useRef(null);
    const wavRecorderRef = React.useRef(null);
    const wavPlayerRef = React.useRef(null);

    // 采样率
    const sampleRate = 24000;

    // Initialize Realtime components
    React.useEffect(() => {
      if (!sessionId) {
        console.log('⏳ 等待sessionId...');
        return;
      }

      const initializeRealtime = async () => {
        try {
          console.log('🎤 开始初始化实时语音服务，sessionId:', sessionId);
          
          // 检查全局库是否已加载
          if (!window.RealtimeClient || !window.WavRecorder || !window.WavStreamPlayer) {
            throw new Error('实时语音库未加载，请刷新页面重试');
          }

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
    }, [sessionId]); // 依赖sessionId

    const setupEventHandlers = () => {
      const client = clientRef.current;
      
      // 连接事件
      client.on('realtime.connecting', () => {
        console.log('🔄 正在连接到实时语音API...');
        setConnectionError('');
      });

      client.on('realtime.connected', () => {
        console.log('✅ 已连接到实时语音API');
        setIsConnected(true);
        setConnectionError('');
        
        // 通知父组件实时语音已就绪
        if (onReady) {
          onReady(true);
        }
      });

      client.on('realtime.disconnected', () => {
        console.log('❌ 与实时语音API断开连接');
        setIsConnected(false);
        if (onReady) {
          onReady(false);
        }
      });

      client.on('error', (error) => {
        console.error('❌ 实时语音API错误:', error);
        setConnectionError('连接错误：' + (error.message || '未知错误'));
        if (onReady) {
          onReady(false);
        }
      });

      // 对话事件 - 按照Step-Realtime-Console的方式处理
      client.on('conversation.updated', async (data) => {
        const { item, delta } = data;
        
        console.log('📝 对话更新:', { item: item?.id, delta: !!delta });
        
        // 处理音频播放
        if (delta?.audio) {
          console.log('🔊 接收到AI音频数据');
          wavPlayerRef.current.add16BitPCM(delta.audio, item.id);
          setIsSpeaking(true);
        }
        
        // 处理转录文本
        if (delta?.transcript) {
          console.log('📝 用户转录:', delta.transcript);
          onTranscript?.(delta.transcript);
        }
        
        // 处理完成的响应
        if (item?.status === 'completed' && item?.role === 'assistant') {
          const transcript = item.formatted?.transcript || item.content?.[0]?.transcript || '';
          console.log('✅ AI回复完成:', transcript);
          
          if (transcript) {
            onAIResponse?.(transcript);
          }
          setIsProcessing(false);
          setIsSpeaking(false);
        }
      });

      // VAD事件处理
      client.on('conversation.interrupted', async () => {
        console.log('⏸️ 对话被打断');
        const trackSampleOffset = await wavPlayerRef.current.interrupt();
        if (trackSampleOffset?.trackId) {
          const { trackId, offset } = trackSampleOffset;
          client.cancelResponse(trackId, offset);
        }
        setIsSpeaking(false);
      });

      // 服务器VAD事件
      client.on('server.input_audio_buffer.speech_started', () => {
        console.log('🎤 检测到用户开始说话');
        setIsRecording(true);
      });

      client.on('server.input_audio_buffer.speech_stopped', () => {
        console.log('🤐 检测到用户停止说话');
        setIsRecording(false);
      });

      // 响应开始和结束
      client.on('server.response.audio.delta', () => {
        if (!isSpeaking) {
          console.log('🔊 AI开始播放音频');
          setIsSpeaking(true);
        }
      });

      client.on('server.response.done', () => {
        console.log('✅ AI回复完成');
        setIsSpeaking(false);
        setIsProcessing(false);
      });
    };

    // 自动开始VAD录音（当连接建立后）
    React.useEffect(() => {
      if (isConnected && clientRef.current && wavRecorderRef.current) {
        const startVADRecording = async () => {
          try {
            console.log('🎤 开始VAD录音模式');
            
            // 确保会话配置已发送（后端会自动发送）
            // 这里我们开始录音，让服务器的VAD来检测语音
            await wavRecorderRef.current.record((data) => {
              clientRef.current.appendInputAudio(data.mono);
            });
            
            console.log('✅ VAD录音模式已启动');
            
          } catch (error) {
            console.error('❌ 启动VAD录音失败:', error);
            setConnectionError('启动语音检测失败：' + error.message);
          }
        };

        // 延迟启动，确保连接稳定
        const timer = setTimeout(startVADRecording, 1000);
        return () => clearTimeout(timer);
      }
    }, [isConnected]);

    // 手动录制控制（用于测试）
    const startRecording = async () => {
      if (!isConnected || !wavRecorderRef.current || !clientRef.current) return;

      try {
        console.log('🎤 手动开始录制');
        setIsRecording(true);
        
        if (wavRecorderRef.current.getStatus() !== 'recording') {
          await wavRecorderRef.current.record((data) => {
            clientRef.current.appendInputAudio(data.mono);
          });
        }
        
      } catch (error) {
        console.error('❌ 手动录制失败:', error);
        setConnectionError('开始录制失败：' + error.message);
        setIsRecording(false);
      }
    };

    const stopRecording = async () => {
      if (!wavRecorderRef.current || !clientRef.current) return;

      try {
        console.log('🛑 手动停止录制');
        await wavRecorderRef.current.pause();
        clientRef.current.createResponse();
        setIsRecording(false);
        setIsProcessing(true);
      } catch (error) {
        console.error('❌ 停止录制失败:', error);
        setIsRecording(false);
        setIsProcessing(false);
      }
    };

    const getStatusDisplay = () => {
      if (connectionError) {
        return { color: 'text-red-600', bg: 'bg-red-500', text: '连接错误' };
      }
      if (!sessionId) {
        return { color: 'text-gray-500', bg: 'bg-gray-300', text: '等待会话ID...' };
      }
      if (isSpeaking) {
        return { color: 'text-blue-600', bg: 'bg-blue-500', text: 'AI正在回答...' };
      }
      if (isRecording) {
        return { color: 'text-red-500', bg: 'bg-red-500', text: '正在听你说话...' };
      }
      if (isConnected) {
        return { color: 'text-green-600', bg: 'bg-green-500', text: '实时对话进行中' };
      }
      return { color: 'text-gray-500', bg: 'bg-gray-300', text: '正在连接...' };
    };

    const status = getStatusDisplay();

    return (
      <div data-name="realtime-voice-chat" data-file="components/RealtimeVoiceChat.js">
        <div className="py-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`w-4 h-4 rounded-full ${status.bg} ${(isRecording || isSpeaking) ? 'animate-pulse' : ''}`}></div>
            <span className={`font-semibold ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {connectionError && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200 mb-4">
              <p className="text-sm text-red-600 mb-2">{connectionError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
              >
                重新加载
              </button>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              {isConnected 
                ? '🎤 实时语音对话进行中，直接开始说话即可'
                : '正在连接实时语音服务，请稍候...'
              }
            </p>
            
            {sessionId && (
              <p className="text-xs text-[var(--text-secondary)]">
                会话: {sessionId.substring(0, 8)}...
              </p>
            )}
            
            {isConnected && (
              <div className="mt-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  💡 语音自动检测已启用，无需按键直接说话
                </p>
              </div>
            )}
          </div>
          
          {!isConnected && !connectionError && sessionId && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-color)] mx-auto mb-2"></div>
              <p className="text-xs text-[var(--text-secondary)]">
                正在连接实时语音服务...
              </p>
            </div>
          )}

          {/* 手动控制按钮（用于测试） */}
          {isConnected && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing || isSpeaking}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording ? '停止录制' : '手动录制'}
              </button>
            </div>
          )}

          {/* 状态指示器 */}
          <div className="mt-4 flex justify-center items-center gap-4 text-xs text-[var(--text-secondary)]">
            <div className={`flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>连接</span>
            </div>
            <div className={`flex items-center gap-1 ${isRecording ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-400'}`}></div>
              <span>录音</span>
            </div>
            <div className={`flex items-center gap-1 ${isSpeaking ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
              <span>播放</span>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ RealtimeVoiceChat组件错误:', error);
    return (
      <div className="py-6 text-center">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-600">实时语音组件加载失败: {error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }
}