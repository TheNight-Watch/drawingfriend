export const OptimizedAudioProcessorWorklet = `
class OptimizedAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.foundAudio = false;
    this.recording = false;
    this.chunks = [];
    this.chunkLength = 128; // 优化的块大小
    this.chunkIndex = 0;
    this.sliceIndex = 16; // 跳过前16个样本避免噪声
    
    // 高级音频处理参数
    this.noiseGate = -40; // dB噪声门限
    this.autoGainControl = true;
    this.gainMultiplier = 1.0;
    this.averageLevel = 0;
    this.levelSmoothingFactor = 0.95;
    
    // 儿童语音优化参数
    this.childVoiceOptimization = {
      highPassFreq: 100,    // Hz 高通滤波
      lowPassFreq: 8000,    // Hz 低通滤波
      compressorRatio: 4.0, // 压缩比
      gainBoost: 2.0        // 增益提升
    };
    
    // 事件处理
    this.port.onmessage = (event) => {
      const { event: eventType, data } = event.data;
      
      switch (eventType) {
        case 'start':
          this.recording = true;
          this.foundAudio = false;
          this.chunks = [];
          this.chunkIndex = 0;
          this.port.postMessage({ 
            event: 'receipt', 
            id: data.id, 
            data: { success: true } 
          });
          break;
          
        case 'stop':
          this.recording = false;
          this.port.postMessage({ 
            event: 'receipt', 
            id: data.id, 
            data: { success: true } 
          });
          break;
          
        case 'clear':
          this.chunks = [];
          this.chunkIndex = 0;
          this.foundAudio = false;
          this.port.postMessage({ 
            event: 'receipt', 
            id: data.id, 
            data: { success: true } 
          });
          break;
          
        case 'read':
          const audioData = this.getAudioData();
          this.port.postMessage({ 
            event: 'receipt', 
            id: data.id, 
            data: audioData 
          });
          break;
          
        case 'export':
          const exportData = this.exportAudio();
          this.port.postMessage({ 
            event: 'receipt', 
            id: data.id, 
            data: exportData 
          });
          break;
          
        case 'updateSettings':
          this.updateProcessingSettings(data.settings);
          this.port.postMessage({ 
            event: 'receipt', 
            id: data.id, 
            data: { success: true } 
          });
          break;
          
        default:
          this.port.postMessage({ 
            event: 'receipt', 
            id: data.id, 
            data: { error: \`Unknown event: \${eventType}\` } 
          });
      }
    };
  }
  
  // 更新处理设置
  updateProcessingSettings(settings) {
    if (settings.noiseGate !== undefined) {
      this.noiseGate = settings.noiseGate;
    }
    if (settings.autoGainControl !== undefined) {
      this.autoGainControl = settings.autoGainControl;
    }
    if (settings.childVoiceOptimization !== undefined) {
      Object.assign(this.childVoiceOptimization, settings.childVoiceOptimization);
    }
  }
  
  // 高级音频处理
  processAudioChunk(inputData) {
    let processedData = new Float32Array(inputData);
    
    // 1. 噪声门控
    const avgLevel = this.calculateRMSLevel(processedData);
    this.averageLevel = this.averageLevel * this.levelSmoothingFactor + 
                       avgLevel * (1 - this.levelSmoothingFactor);
    
    if (this.averageLevel < Math.pow(10, this.noiseGate / 20)) {
      // 静音处理
      processedData.fill(0);
      return { processed: processedData, level: 0, isSilent: true };
    }
    
    // 2. 自动增益控制（针对儿童语音）
    if (this.autoGainControl) {
      const targetLevel = 0.3; // 目标音量
      if (this.averageLevel < targetLevel) {
        const gainAdjust = Math.min(
          targetLevel / this.averageLevel, 
          this.childVoiceOptimization.gainBoost
        );
        this.gainMultiplier = Math.min(
          this.gainMultiplier * 1.01 + gainAdjust * 0.01,
          this.childVoiceOptimization.gainBoost
        );
      } else {
        this.gainMultiplier = Math.max(this.gainMultiplier * 0.99, 1.0);
      }
      
      // 应用增益
      for (let i = 0; i < processedData.length; i++) {
        processedData[i] *= this.gainMultiplier;
      }
    }
    
    // 3. 软限幅器（防止削波）
    for (let i = 0; i < processedData.length; i++) {
      if (Math.abs(processedData[i]) > 0.95) {
        processedData[i] = Math.sign(processedData[i]) * 
                          (0.95 - 0.05 * Math.random()); // 添加微小抖动
      }
    }
    
    return { 
      processed: processedData, 
      level: this.averageLevel, 
      isSilent: false 
    };
  }
  
  // 计算RMS音频电平
  calculateRMSLevel(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }
  
  // 数据类型转换优化
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // 优化的转换，包含抖动
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = Math.round(sample * 32767 + (Math.random() - 0.5));
    }
    return int16Array;
  }
  
  // 发送音频块
  sendChunk(chunk) {
    const rawChannels = chunk.map(channel => this.float32ToInt16(channel));
    const monoChannel = this.float32ToInt16(chunk[0]);
    
    // 转换为ArrayBuffer
    const rawBuffer = new ArrayBuffer(rawChannels[0].byteLength);
    const monoBuffer = new ArrayBuffer(monoChannel.byteLength);
    
    new Int16Array(rawBuffer).set(rawChannels[0]);
    new Int16Array(monoBuffer).set(monoChannel);
    
    this.port.postMessage({
      event: 'chunk',
      data: {
        raw: rawBuffer,
        mono: monoBuffer,
        level: this.averageLevel,
        gain: this.gainMultiplier
      }
    });
  }
  
  // 获取音频数据
  getAudioData() {
    if (this.chunks.length === 0) {
      return { meanValues: new Float32Array(0), channels: [] };
    }
    
    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk[0].length, 0);
    const meanValues = new Float32Array(totalLength);
    const channels = [new Float32Array(totalLength)];
    
    let offset = 0;
    for (const chunk of this.chunks) {
      const chunkData = chunk[0];
      meanValues.set(chunkData, offset);
      channels[0].set(chunkData, offset);
      offset += chunkData.length;
    }
    
    return { meanValues, channels };
  }
  
  // 导出音频
  exportAudio() {
    const audioData = this.getAudioData();
    const channels = audioData.channels;
    const rawData = this.float32ToInt16(channels[0]);
    
    return {
      audio: {
        bitsPerSample: 16,
        channels: channels,
        data: rawData
      }
    };
  }
  
  // 主处理循环
  process(inputList, outputList, parameters) {
    const inputs = inputList[0];
    
    if (!inputs || inputs.length === 0) {
      return true;
    }
    
    // 检测音频输入
    if (!this.foundAudio) {
      for (const channel of inputs) {
        const hasAudio = channel.some(sample => Math.abs(sample) > 0.001);
        if (hasAudio) {
          this.foundAudio = true;
          break;
        }
      }
    }
    
    // 处理音频
    if (this.foundAudio && this.recording && inputs[0]) {
      const inputChannel = inputs[0];
      const sliceIndex = Math.min(this.sliceIndex, inputChannel.length);
      const audioSlice = inputChannel.slice(sliceIndex);
      
      if (audioSlice.length > 0) {
        const { processed, level, isSilent } = this.processAudioChunk(audioSlice);
        
        // 只有非静音时才发送
        if (!isSilent) {
          const chunk = [processed];
          this.chunks.push(chunk);
          this.sendChunk(chunk);
        }
      }
    }
    
    return true;
  }
}

registerProcessor('optimized_audio_processor', OptimizedAudioProcessor);
`;

const script = new Blob([OptimizedAudioProcessorWorklet], {
  type: 'application/javascript'
});
const src = URL.createObjectURL(script);
export const OptimizedAudioProcessorSrc = src;