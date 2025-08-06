function SimpleVoiceChat({ onTranscript, onAIResponse, imageAnalysis, isProcessing, setIsProcessing }) {
  try {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [connectionError, setConnectionError] = React.useState('');
    const [transcript, setTranscript] = React.useState('');
    
    const wsRef = React.useRef(null);
    const mediaRecorderRef = React.useRef(null);
    const streamRef = React.useRef(null);

    // 初始化WebSocket连接
    React.useEffect(() => {
      const initializeWebSocket = () => {
        try {
          console.log('正在连接WebSocket服务器...');
          wsRef.current = new WebSocket('ws://localhost:8082');
          
          wsRef.current.onopen = () => {
            console.log('WebSocket连接成功');
            setIsConnected(true);
            setConnectionError('');
            
            // 发送初始化消息，包含图像上下文
            if (imageAnalysis) {
              const contextMessage = {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'],
                  instructions: buildImageContext(imageAnalysis)
                }
              };
              wsRef.current.send(JSON.stringify(contextMessage));
            }
          };
          
          wsRef.current.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              handleWebSocketMessage(data);
            } catch (error) {
              console.error('解析WebSocket消息失败:', error);
            }
          };
          
          wsRef.current.onerror = (error) => {
            console.error('WebSocket连接错误:', error);
            setConnectionError('无法连接到语音服务，请确保后端服务正在运行');
            setIsConnected(false);
          };
          
          wsRef.current.onclose = () => {
            console.log('WebSocket连接已断开');
            setIsConnected(false);
            // 自动重连
            setTimeout(initializeWebSocket, 3000);
          };
          
        } catch (error) {
          console.error('初始化WebSocket失败:', error);
          setConnectionError('WebSocket初始化失败：' + error.message);
        }
      };

      initializeWebSocket();

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
        stopRecording();
      };
    }, []);

    // 构建图像上下文信息
    const buildImageContext = (analysis) => {
      if (!analysis) return '你是一个专门与4-6岁儿童对话的AI助手，请用温暖、鼓励的语气进行对话。';
      
      const parts = [
        '你是一个专门与4-6岁儿童对话的AI助手。',
        '孩子刚刚完成了一幅绘画作品，以下是画面分析：'
      ];
      
      if (analysis.description) {
        parts.push(`画面描述：${analysis.description}`);
      }
      
      if (analysis.objects && analysis.objects.length > 0) {
        parts.push(`主要元素：${analysis.objects.slice(0, 5).join('、')}`);
      }
      
      if (analysis.scene) {
        parts.push(`场景：${analysis.scene}`);
      }
      
      if (analysis.mood) {
        parts.push(`情绪：${analysis.mood}`);
      }
      
      parts.push('请根据这幅画的内容，用温暖、鼓励的语气与孩子对话，引导他们创作故事。回答要简短、生动，适合儿童理解。');
      
      return parts.join('\n');
    };

    // 处理WebSocket消息
    const handleWebSocketMessage = (data) => {
      console.log('收到WebSocket消息:', data);
      
      if (data.type === 'conversation.item.created') {
        const item = data.item;
        if (item.role === 'assistant' && item.content) {
          const textContent = item.content.find(c => c.type === 'text');
          if (textContent) {
            onAIResponse?.(textContent.text);
            setIsProcessing(false);
          }
        }
      }
      
      if (data.type === 'response.audio.delta' && data.delta) {
        // 播放音频响应（简化版本，直接忽略音频播放）
        console.log('收到音频数据');
      }
      
      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const transcription = data.transcript;
        if (transcription) {
          setTranscript(transcription);
          onTranscript?.(transcription);
        }
      }
      
      if (data.type === 'error') {
        console.error('服务器错误:', data);
        setConnectionError('服务器错误：' + data.message);
      }
    };

    // 开始录音
    const startRecording = async () => {
      if (!isConnected || isRecording) return;
      
      try {
        console.log('请求麦克风权限...');
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
          mimeType: 'audio/webm;codecs=opus'
        });

        const audioChunks = [];
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const base64Audio = await blobToBase64(audioBlob);
            
            // 发送音频数据到WebSocket
            const message = {
              type: 'input_audio_buffer.append',
              audio: base64Audio.split(',')[1] // 移除data:audio/webm;base64,前缀
            };
            
            wsRef.current.send(JSON.stringify(message));
            
            // 提交音频用于处理
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.commit'
            }));
            
            // 创建响应
            wsRef.current.send(JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio']
              }
            }));
            
            setIsProcessing(true);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        console.log('录音已开始');
        
      } catch (error) {
        console.error('启动录音失败:', error);
        setConnectionError('无法访问麦克风：' + error.message);
      }
    };

    // 停止录音
    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        console.log('录音已停止');
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    // 工具函数：将Blob转换为base64
    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    // 自动录音逻辑
    React.useEffect(() => {
      if (isConnected && !isProcessing && !isRecording) {
        const timer = setTimeout(() => {
          startRecording();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [isConnected, isProcessing, isRecording]);

    // 获取状态显示
    const getStatusDisplay = () => {
      if (connectionError) {
        return { color: 'text-red-600', bg: 'bg-red-500', text: '连接错误' };
      }
      if (isProcessing) {
        return { color: 'text-blue-600', bg: 'bg-blue-500', text: 'AI正在思考...' };
      }
      if (isRecording) {
        return { color: 'text-red-500', bg: 'bg-red-500', text: '正在听你说话...' };
      }
      if (isConnected) {
        return { color: 'text-green-600', bg: 'bg-green-500', text: '等待语音输入' };
      }
      return { color: 'text-gray-500', bg: 'bg-gray-300', text: '正在连接...' };
    };

    const status = getStatusDisplay();

    return (
      <div data-name="simple-voice-chat" data-file="components/SimpleVoiceChat.js">
        <div className="py-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`w-4 h-4 rounded-full ${status.bg} ${(isRecording || isProcessing) ? 'animate-pulse' : ''}`}></div>
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
          
          {transcript && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
              <p className="text-sm text-blue-600 mb-1">识别到的语音：</p>
              <p className="text-blue-800">{transcript}</p>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              简化版实时语音对话系统
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {isConnected ? '直接开始说话，AI会实时回应' : '正在连接到语音服务...'}
            </p>
          </div>
          
          {/* 手动控制按钮 */}
          {isConnected && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording ? '停止录音' : '开始录音'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('SimpleVoiceChat component error:', error);
    return (
      <div className="py-6 text-center">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-600">语音组件加载失败：{error.message}</p>
        </div>
      </div>
    );
  }
}