function WavRecorder({ onAudioData, isRecording, setIsRecording, isProcessing }) {
  try {
    const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
    const [errorMessage, setErrorMessage] = React.useState('');
    const [transcript, setTranscript] = React.useState('');
    const recorderRef = React.useRef(null);

    // Initialize WavRecorder
    React.useEffect(() => {
      const initializeRecorder = async () => {
        try {
          // Import WavRecorder from the wavtools library
          const { WavRecorder } = await import('../lib/wavtools/index.js');
          
          recorderRef.current = new WavRecorder({
            sampleRate: 24000, // 24kHz for better quality
            outputToSpeakers: false,
            debug: true
          });

          // Set up chunk processor to handle audio data
          await recorderRef.current.begin();
          
          recorderRef.current.onChunkProcessor = (chunk) => {
            if (onAudioData && chunk.mono) {
              // Convert to the format expected by the API
              const audioData = new Int16Array(chunk.mono);
              onAudioData(audioData);
            }
          };

          setConnectionStatus('connected');
          console.log('WavRecorder initialized successfully');
          
        } catch (error) {
          console.error('Failed to initialize WavRecorder:', error);
          setErrorMessage('音频录制初始化失败：' + error.message);
          setConnectionStatus('error');
        }
      };

      initializeRecorder();

      return () => {
        if (recorderRef.current) {
          recorderRef.current.end();
        }
      };
    }, []);

    // Handle recording state changes
    React.useEffect(() => {
      const handleRecording = async () => {
        if (!recorderRef.current) return;

        try {
          if (isRecording && !recorderRef.current.recording) {
            await recorderRef.current.record((chunk) => {
              if (onAudioData && chunk.mono) {
                // Convert ArrayBuffer to Int16Array for API compatibility
                const audioData = new Int16Array(chunk.mono);
                onAudioData(audioData);
              }
            });
            setConnectionStatus('recording');
            console.log('Started recording');
          } else if (!isRecording && recorderRef.current.recording) {
            await recorderRef.current.pause();
            setConnectionStatus('connected');
            console.log('Stopped recording');
          }
        } catch (error) {
          console.error('Recording state change error:', error);
          setErrorMessage('录制状态切换失败：' + error.message);
        }
      };

      handleRecording();
    }, [isRecording, onAudioData]);

    // Start recording when not processing
    React.useEffect(() => {
      if (!isProcessing && connectionStatus === 'connected' && !isRecording) {
        const timer = setTimeout(() => {
          setIsRecording(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [isProcessing, connectionStatus, isRecording, setIsRecording]);

    // Stop recording when processing
    React.useEffect(() => {
      if (isProcessing && isRecording) {
        setIsRecording(false);
      }
    }, [isProcessing, isRecording, setIsRecording]);

    const handleRetryConnection = async () => {
      setErrorMessage('');
      try {
        if (recorderRef.current) {
          await recorderRef.current.begin();
          setConnectionStatus('connected');
        }
      } catch (error) {
        setErrorMessage('重新连接失败：' + error.message);
      }
    };

    const getStatusDisplay = () => {
      switch (connectionStatus) {
        case 'recording':
          return { color: 'text-red-500', bg: 'bg-red-500', text: '正在听你说话...' };
        case 'connected':
          return { color: 'text-green-600', bg: 'bg-green-500', text: '等待语音输入' };
        case 'error':
          return { color: 'text-red-600', bg: 'bg-red-500', text: '连接错误' };
        default:
          return { color: 'text-gray-500', bg: 'bg-gray-300', text: '正在连接...' };
      }
    };

    const status = getStatusDisplay();

    return (
      <div data-name="wav-recorder" data-file="components/WavRecorder.js">
        <div className="py-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`w-4 h-4 rounded-full ${status.bg} ${connectionStatus === 'recording' ? 'animate-pulse' : ''}`}></div>
            <span className={`font-semibold ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {errorMessage && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200 mb-4">
              <p className="text-sm text-red-600 mb-2">{errorMessage}</p>
              <button 
                onClick={handleRetryConnection}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
              >
                重新连接
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
              使用高质量音频录制，24kHz采样率
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              直接开始说话，系统会自动识别你的语音
            </p>
          </div>
          
          {connectionStatus === 'disconnected' && !errorMessage && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-color)] mx-auto mb-2"></div>
              <p className="text-xs text-[var(--text-secondary)]">
                正在初始化音频录制服务...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('WavRecorder component error:', error);
    return (
      <div className="py-6 text-center">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-600">音频组件加载失败</p>
        </div>
      </div>
    );
  }
}