// Fallback Speech Recognition Service using Web Speech API
class FallbackSpeechService {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
  }

  // Initialize browser speech recognition
  initialize() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.onErrorCallback?.(new Error('浏览器不支持语音识别功能'));
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.onStatusCallback?.('recording');
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      if (interim) {
        this.onResultCallback?.({ text: interim, isFinal: false });
      }
      
      if (finalTranscript) {
        this.onResultCallback?.({ text: finalTranscript, isFinal: true });
      }
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.onStatusCallback?.('stopped');
    };

    this.recognition.onerror = (event) => {
      this.isRecording = false;
      this.onErrorCallback?.(new Error(`语音识别错误: ${event.error}`));
    };

    return true;
  }

  // Start recording
  async startRecording() {
    if (!this.recognition && !this.initialize()) {
      return;
    }

    try {
      this.recognition.start();
      this.onStatusCallback?.('connected');
    } catch (error) {
      this.onErrorCallback?.(error);
    }
  }

  // Stop recording
  stopRecording() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  // Disconnect
  disconnect() {
    this.stopRecording();
  }

  // Set callbacks
  setCallbacks(onResult, onError, onStatus) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStatusCallback = onStatus;
  }
}

// Global fallback instance
window.fallbackSpeechService = new FallbackSpeechService();