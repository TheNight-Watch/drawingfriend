function OptimizedRealtimeVoiceChat({ onTranscript, onAIResponse, imageAnalysis, isProcessing, setIsProcessing, sessionId, onReady }) {
  try {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [connectionError, setConnectionError] = React.useState('');
    const [librariesLoaded, setLibrariesLoaded] = React.useState(false);
    const [optimizedLibrariesLoaded, setOptimizedLibrariesLoaded] = React.useState(false);
    const [conversationalMode, setConversationalMode] = React.useState('realtime');
    const [audioLevel, setAudioLevel] = React.useState(0);
    const [audioQuality, setAudioQuality] = React.useState({ score: 0, status: 'unknown' });
    
    const clientRef = React.useRef(null);
    const wavRecorderRef = React.useRef(null);
    const wavPlayerRef = React.useRef(null);
    const waveformRef = React.useRef(null);
    const waveSurferRef = React.useRef(null);
    const qualityMonitorRef = React.useRef(null);
    
    // 采样率优化为24kHz，平衡质量和性能
    const sampleRate = 24000;
    
    // 监听原始库加载事件
    React.useEffect(() => {
      const checkLibraries = () => {
        if (window.RealtimeClient && window.WavRecorder && window.WavStreamPlayer) {
          console.log('✅ 原始实时语音库检查通过');
          setLibrariesLoaded(true);
          return true;
        }
        return false;
      };

      if (checkLibraries()) {
        return;
      }

      const handleLibrariesLoaded = () => {
        console.log('📡 收到原始库加载完成事件');
        checkLibraries();
      };

      window.addEventListener('realtimeLibrariesLoaded', handleLibrariesLoaded);
      
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
    
    // 加载优化的音频库
    React.useEffect(() => {
      const loadOptimizedLibraries = async () => {
        try {
          console.log('📚 开始加载优化音频库...');
          
          // 动态导入优化的音频组件
          const optimizedModule = await import('../lib/wavtools/optimized_index.js');
          const { 
            OptimizedWavRecorder, 
            OptimizedWavStreamPlayer, 
            AudioQualityMonitor,
            createOptimizedRealtimeAudio 
          } = optimizedModule;
          
          // 挂载到window对象
          window.OptimizedWavRecorder = OptimizedWavRecorder;
          window.OptimizedWavStreamPlayer = OptimizedWavStreamPlayer;
          window.AudioQualityMonitor = AudioQualityMonitor;
          window.createOptimizedRealtimeAudio = createOptimizedRealtimeAudio;
          
          console.log('✅ 优化音频库加载成功');
          setOptimizedLibrariesLoaded(true);
          
        } catch (error) {
          console.error('❌ 优化音频库加载失败:', error);
          console.log('📋 将使用原始音频库');
          setOptimizedLibrariesLoaded(true); // 允许使用原始库继续
        }
      };
      
      loadOptimizedLibraries();
    }, []);
    
    // 初始化音频质量监控
    React.useEffect(() => {
      if (optimizedLibrariesLoaded && window.AudioQualityMonitor) {
        const monitor = new window.AudioQualityMonitor();
        
        monitor.addCallback((metrics) => {
          setAudioLevel(metrics.inputLevel * 100);
          const score = monitor.getQualityScore();
          const status = monitor.getQualityStatus();
          
          setAudioQuality({ score, status, recommendations: monitor.getRecommendations() });
        });
        
        qualityMonitorRef.current = monitor;
        
        // 每秒更新监控数据
        const monitorInterval = setInterval(() => {
          if (wavRecorderRef.current && wavPlayerRef.current) {
            monitor.updateMetrics(wavRecorderRef.current, wavPlayerRef.current);
          }
        }, 1000);
        
        return () => clearInterval(monitorInterval);
      }
    }, [optimizedLibrariesLoaded]);

    // 初始化音频可视化
    React.useEffect(() => {
      if (!librariesLoaded || !optimizedLibrariesLoaded || !waveformRef.current) return;

      const initWaveSurfer = async () => {
        try {
          if (typeof WaveSurfer === 'undefined') {
            console.log('⏳ 等待WaveSurfer加载...');
            return;
          }

          console.log('🌊 初始化优化WaveSurfer音频可视化');
          
          waveSurferRef.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#6B73FF',
            progressColor: '#E91E63',
            cursorColor: '#F39C12',
            barWidth: 2,
            barGap: 1,
            barRadius: 1,
            height: 50,
            normalize: true,
            backend: 'WebAudio',
            // 优化配置
            pixelRatio: 1,
            scrollParent: false,
            hideScrollbar: true
          });

          console.log('✅ 优化WaveSurfer初始化成功');
        } catch (error) {
          console.error('❌ WaveSurfer初始化失败:', error);
        }
      };

      const timer = setTimeout(initWaveSurfer, 500);
      return () => clearTimeout(timer);
    }, [librariesLoaded, optimizedLibrariesLoaded]);

    // 初始化实时语音组件
    React.useEffect(() => {
      if (!sessionId || !librariesLoaded || !optimizedLibrariesLoaded) {
        console.log('⏳ 等待依赖组件加载...', { sessionId: !!sessionId, librariesLoaded, optimizedLibrariesLoaded });
        return;
      }

      const initializeOptimizedRealtime = async () => {
        try {
          console.log('🚀 开始初始化优化实时语音服务，sessionId:', sessionId);
          
          const RealtimeClient = window.RealtimeClient;
          
          // 使用优化的音频组件（如果可用）
          let WavRecorder, WavStreamPlayer;
          if (window.OptimizedWavRecorder && window.OptimizedWavStreamPlayer) {
            console.log('📈 使用优化音频组件');
            WavRecorder = window.OptimizedWavRecorder;
            WavStreamPlayer = window.OptimizedWavStreamPlayer;
          } else {
            console.log('📋 使用原始音频组件');
            WavRecorder = window.WavRecorder;
            WavStreamPlayer = window.WavStreamPlayer;
          }

          // WebSocket代理URL
          let wsProxyUrl = `ws://localhost:8082?sessionId=${sessionId}&model=step-1o-audio`;
          
          console.log('🔗 连接WebSocket代理:', wsProxyUrl);
          
          // 创建实时客户端
          clientRef.current = new RealtimeClient({ 
            url: wsProxyUrl,
            apiKey: 'dummy-key',
            dangerouslyAllowAPIKeyInBrowser: true,
            debug: true
          });

          // 初始化优化的音频组件
          const recorderConfig = {
            sampleRate: sampleRate,
            childVoiceMode: true,  // 儿童语音优化
            debug: false,
            outputToSpeakers: false
          };
          
          const playerConfig = {
            sampleRate: sampleRate,
            debug: false
          };
          
          wavRecorderRef.current = new WavRecorder(recorderConfig);
          wavPlayerRef.current = new WavStreamPlayer(playerConfig);

          // 设置事件处理器
          setupOptimizedEventHandlers();

          // 初始化音频组件
          await wavRecorderRef.current.begin();
          await wavPlayerRef.current.connect();
          
          console.log('🎵 音频组件初始化成功');
          
          // 连接实时客户端
          await clientRef.current.connect();
          
          console.log('✅ 优化实时语音客户端连接成功');
          setConnectionError('');
          setIsConnected(true);
          
          // 实时模式自动开始录音
          if (conversationalMode === 'realtime') {
            console.log('🎤 实时模式，自动开始录音');
            await wavRecorderRef.current.record(data => {
              if (clientRef.current && data.mono) {
                clientRef.current.appendInputAudio(data.mono);
              }
            });
            setIsRecording(true);
          }
          
        } catch (error) {
          console.error('❌ 优化实时语音服务初始化失败:', error);
          setConnectionError('实时语音服务初始化失败：' + error.message);
        }
      };

      initializeOptimizedRealtime();

      return () => {
        console.log('🧹 清理优化实时语音组件');
        
        if (clientRef.current) {
          try {
            clientRef.current.disconnect();
          } catch (e) {
            console.log('清理客户端时出错:', e);
          }
        }
        
        if (wavRecorderRef.current) {
          try {
            wavRecorderRef.current.end();
          } catch (e) {
            console.log('清理录音器时出错:', e);
          }
        }
        
        if (wavPlayerRef.current) {
          try {
            wavPlayerRef.current.interrupt();
            wavPlayerRef.current.disconnect();
          } catch (e) {
            console.log('清理播放器时出错:', e);
          }
        }
      };
    }, [sessionId, librariesLoaded, optimizedLibrariesLoaded, conversationalMode]);

    const setupOptimizedEventHandlers = () => {
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
        
        // 优化的会话配置（针对儿童语音）
        client.updateSession({
          instructions: `你是一个友善的AI助手，专门与4-6岁的儿童对话。你正在帮助他们基于他们的绘画创作有趣的故事。
          请使用简单、积极的语言，多提出引导性的问题来激发他们的想象力。
          语速要适中，吐字要清晰，多使用拟声词和生动的描述。`,
          voice: 'jingdiannvsheng',
          turn_detection: conversationalMode === 'realtime' ? { 
            type: 'server_vad',
            threshold: 0.4,           // 儿童语音检测阈值
            prefix_padding_ms: 200,   // 前置填充
            silence_duration_ms: 300  // 静音持续时间
          } : null,
          input_audio_transcription: { model: 'whisper-1' },
          // 优化音频格式
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16'
        });

        if (onReady) {
          onReady();
        }
      });

      // 监听会话创建成功事件
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

      // 优化的中断处理
      client.on('conversation.interrupted', async () => {
        console.log('🛑 检测到用户说话，中断AI回复');
        if (wavPlayerRef.current) {
          const trackSampleOffset = await wavPlayerRef.current.interrupt();
          if (trackSampleOffset?.trackId) {
            const { trackId, offset } = trackSampleOffset;
            client.cancelResponse(trackId, offset);
          }
        }
        setIsSpeaking(false);
      });

      // 对话更新事件
      client.on('conversation.updated', ({ item, delta }) => {
        if (delta?.transcript) {
          if (onTranscript) {
            onTranscript(delta.transcript);
          }
        }
        
        if (delta?.audio && wavPlayerRef.current) {
          try {
            wavPlayerRef.current.add16BitPCM(delta.audio, item.id);
          } catch (error) {
            console.warn('音频播放错误:', error);
          }
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

    // 手动录音控制
    const startRecording = async () => {
      if (!isConnected || !clientRef.current || !wavRecorderRef.current) {
        console.warn('⚠️ 实时语音服务未准备好');
        return;
      }

      try {
        console.log('🎤 开始手动录制音频');
        await wavRecorderRef.current.record((data) => {
          if (clientRef.current && data.mono) {
            clientRef.current.appendInputAudio(data.mono);
          }
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
        console.log('🛑 停止手动录制音频');
        await wavRecorderRef.current.pause();
        setIsRecording(false);
        
        if (clientRef.current) {
          clientRef.current.createResponse();
        }
      } catch (error) {
        console.error('❌ 录制停止失败:', error);
      }
    };

    const interrupt = async () => {
      if (wavPlayerRef.current) {
        await wavPlayerRef.current.interrupt();
      }
      if (clientRef.current) {
        clientRef.current.cancelResponse();
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
        
        // 停止当前录音
        if (isRecording) {
          await wavRecorderRef.current.pause();
          setIsRecording(false);
        }
        
        // 更新会话设置
        clientRef.current.updateSession({
          turn_detection: newMode === 'realtime' ? { 
            type: 'server_vad',
            threshold: 0.4,
            prefix_padding_ms: 200,
            silence_duration_ms: 300
          } : null
        });
        
        // 如果切换到实时模式，自动开始录音
        if (newMode === 'realtime') {
          console.log('🎤 切换到实时模式，开始录音');
          await wavRecorderRef.current.record(data => {
            if (clientRef.current && data.mono) {
              clientRef.current.appendInputAudio(data.mono);
            }
          });
          setIsRecording(true);
        }
        
        setConversationalMode(newMode);
        setIsSpeaking(false);
        
        console.log(`🔄 已切换到${newMode === 'realtime' ? '实时' : '手动'}模式`);
      } catch (error) {
        console.error('❌ 模式切换失败:', error);
      }
    };

    // 显示加载状态
    if (!librariesLoaded || !optimizedLibrariesLoaded) {
      return (
        <div className="sketch-card mb-6">
          <div className="text-center">
            <div className="sketch-loading mb-4">
              <div className="sketch-loading-dot"></div>
              <div className="sketch-loading-dot"></div>
              <div className="sketch-loading-dot"></div>
              <div className="sketch-loading-dot"></div>
            </div>
            <h3 className="hand-drawn-title text-lg mb-2">
              正在加载优化语音库...
            </h3>
            <p className="hand-drawn-subtitle">
              {!librariesLoaded && '正在加载基础语音功能...'}
              {librariesLoaded && !optimizedLibrariesLoaded && '正在加载音频优化组件...'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="sketch-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="hand-drawn-title text-xl">
            🎤 实时语音对话
            {window.OptimizedWavRecorder && (
              <span className="text-sm ml-2" style={{color: 'var(--sketch-green)'}}>
                ⚡ 优化版
              </span>
            )}
          </h3>
          
          <div className="flex items-center gap-4">
            {/* 音频质量指示器 */}
            {audioQuality.score > 0 && (
              <div className="flex items-center gap-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    audioQuality.status === 'excellent' ? 'bg-green-500' :
                    audioQuality.status === 'good' ? 'bg-blue-500' :
                    audioQuality.status === 'fair' ? 'bg-yellow-500' :
                    audioQuality.status === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-xs hand-drawn-subtitle">
                  质量: {audioQuality.score}
                </span>
              </div>
            )}
            
            {/* 模式切换按钮 */}
            {isConnected && (
              <button
                onClick={toggleConversationalMode}
                className={`sketch-btn px-3 py-1 text-sm ${
                  conversationalMode === 'realtime' 
                    ? 'sketch-btn-success'
                    : 'sketch-btn-primary'
                }`}
              >
                {conversationalMode === 'realtime' ? '🔄 实时对话' : '🎤 手动录音'}
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <div className={`sketch-recording-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span className="hand-drawn-subtitle text-sm">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
        </div>

        {connectionError && (
          <div className="sketch-card" style={{borderColor: 'var(--sketch-pink)', backgroundColor: 'var(--paper-cream)'}}>
            <div className="hand-drawn-text" style={{color: 'var(--sketch-pink)'}}>
              <strong>连接错误：</strong>{connectionError}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="sketch-btn sketch-btn-secondary mt-2 text-sm"
            >
              刷新页面
            </button>
          </div>
        )}

        {/* 音频可视化区域 */}
        {isConnected && (isRecording || isSpeaking) && (
          <div className="sketch-waveform-container">
            <div ref={waveformRef} className="sketch-waveform"></div>
            <div className={`sketch-vad-indicator ${(isRecording || isSpeaking) ? 'active' : ''}`}>
              <div className="sketch-vad-bar"></div>
              <div className="sketch-vad-bar"></div>
              <div className="sketch-vad-bar"></div>
              <div className="sketch-vad-bar"></div>
              <div className="sketch-vad-bar"></div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isConnected ? (
            <>
              {/* 根据模式显示不同的UI */}
              {conversationalMode === 'realtime' ? (
                <div className="text-center">
                  <div className="mb-4">
                    <div className={`sketch-audio-level ${
                      isSpeaking ? 'speaking' : isRecording ? 'recording' : ''
                    }`} style={{ '--audio-level': audioLevel + '%' }}>
                      <div className={`sketch-mic-icon ${
                        isSpeaking ? 'speaking' : isRecording ? 'recording' : ''
                      }`}>
                        {isSpeaking ? '🤖' : isRecording ? '🎤' : '💬'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    {isSpeaking ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="hand-drawn-text" style={{color: 'var(--sketch-green)'}}>
                          🤖 AI正在回答...
                        </span>
                        <button 
                          onClick={interrupt}
                          className="sketch-btn sketch-btn-secondary text-sm"
                        >
                          打断
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="hand-drawn-title text-lg" style={{color: 'var(--sketch-green)'}}>
                          🔄 实时对话模式
                        </p>
                        <p className="hand-drawn-subtitle">
                          AI会自动检测您的语音并实时回复
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-4">
                    <div className={`sketch-audio-level ${isRecording ? 'recording' : ''}`} 
                         style={{ '--audio-level': audioLevel + '%' }}>
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isSpeaking || isProcessing}
                        className={`sketch-mic-icon ${isRecording ? 'recording' : ''} ${
                          (isSpeaking || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        style={{ 
                          fontSize: '32px', 
                          background: 'none', 
                          border: 'none',
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        {isRecording ? '🛑' : '🎤'}
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    {isSpeaking ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="hand-drawn-text" style={{color: 'var(--sketch-green)'}}>
                          🤖 AI正在回答...
                        </span>
                        <button 
                          onClick={interrupt}
                          className="sketch-btn sketch-btn-secondary text-sm"
                        >
                          打断
                        </button>
                      </div>
                    ) : isRecording ? (
                      <div>
                        <p className="hand-drawn-title" style={{color: 'var(--sketch-pink)'}}>
                          🎤 正在录制
                        </p>
                        <p className="hand-drawn-subtitle">点击停止录制</p>
                      </div>
                    ) : isProcessing ? (
                      <div>
                        <div className="sketch-loading mb-2">
                          <div className="sketch-loading-dot"></div>
                          <div className="sketch-loading-dot"></div>
                          <div className="sketch-loading-dot"></div>
                        </div>
                        <p className="hand-drawn-subtitle">⏳ 处理中...</p>
                      </div>
                    ) : (
                      <div>
                        <p className="hand-drawn-title text-lg" style={{color: 'var(--sketch-blue)'}}>
                          🎤 手动录音模式
                        </p>
                        <p className="hand-drawn-subtitle">点击麦克风开始对话</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 音频质量提示 */}
              {audioQuality.recommendations && audioQuality.recommendations.length > 0 && (
                <div className="sketch-card" style={{backgroundColor: 'var(--paper-cream)', borderColor: 'var(--sketch-orange)'}}>
                  <div className="hand-drawn-text text-sm" style={{color: 'var(--sketch-brown)'}}>
                    💡 音频质量提示：
                    <ul className="mt-1 ml-4">
                      {audioQuality.recommendations.slice(0, 2).map((rec, index) => (
                        <li key={index} className="text-xs">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {imageAnalysis && (
                <div className="sketch-card" style={{backgroundColor: 'var(--paper-cream)', borderColor: 'var(--sketch-orange)'}}>
                  <div className="hand-drawn-text text-sm" style={{color: 'var(--sketch-brown)'}}>
                    💡 基于你的画作：{imageAnalysis.description || '正在分析中...'}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="sketch-loading mb-4">
                <div className="sketch-loading-dot"></div>
                <div className="sketch-loading-dot"></div>
                <div className="sketch-loading-dot"></div>
                <div className="sketch-loading-dot"></div>
              </div>
              <div className="hand-drawn-subtitle mb-2">
                正在连接实时语音服务...
              </div>
              <div className="hand-drawn-text text-xs" style={{color: 'var(--sketch-brown)'}}>
                会话ID: {sessionId}
              </div>
            </div>
          )}
        </div>
      </div>
    );

  } catch (error) {
    console.error('OptimizedRealtimeVoiceChat组件错误:', error);
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>组件加载错误：</strong>{error.message}
      </div>
    );
  }
}