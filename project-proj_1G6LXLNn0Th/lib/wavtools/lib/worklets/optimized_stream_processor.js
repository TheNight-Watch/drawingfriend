export const OptimizedStreamProcessorWorklet = `
class OptimizedStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.hasStarted = false;
    this.hasInterrupted = false;
    this.outputBuffers = [];
    this.bufferLength = 128; // 优化的缓冲区长度
    this.write = { buffer: new Float32Array(this.bufferLength), trackId: null };
    this.writeOffset = 0;
    this.trackSampleOffsets = {};
    this.interruptedTrackIds = {};
    
    // 高级播放优化参数
    this.crossfadeSamples = 64; // 交叉淡化样本数
    this.smoothingBuffer = new Float32Array(this.crossfadeSamples);
    this.lastOutputLevel = 0;
    this.targetOutputLevel = 0;
    this.levelSmoothingFactor = 0.98;
    
    // 延迟优化
    this.minBufferSize = 2; // 最小缓冲区数量
    this.maxBufferSize = 8; // 最大缓冲区数量
    this.adaptiveBuffering = true;
    this.bufferUnderrunCount = 0;
    this.lastBufferCheck = 0;
    
    this.port.onmessage = (event) => {
      if (event.data) {
        const payload = event.data;
        
        if (payload.event === 'write') {
          this.writeAudioData(payload.buffer, payload.trackId);
        } else if (payload.event === 'offset' || payload.event === 'interrupt') {
          this.handleOffsetRequest(payload);
        } else if (payload.event === 'updateSettings') {
          this.updatePlaybackSettings(payload.settings);
        } else {
          console.warn(\`Unhandled event "\${payload.event}"\`);
        }
      }
    };
  }
  
  // 更新播放设置
  updatePlaybackSettings(settings) {
    if (settings.bufferLength !== undefined) {
      this.bufferLength = Math.max(64, Math.min(512, settings.bufferLength));
    }
    if (settings.adaptiveBuffering !== undefined) {
      this.adaptiveBuffering = settings.adaptiveBuffering;
    }
    if (settings.crossfadeSamples !== undefined) {
      this.crossfadeSamples = Math.max(16, Math.min(128, settings.crossfadeSamples));
      this.smoothingBuffer = new Float32Array(this.crossfadeSamples);
    }
  }
  
  // 处理偏移请求
  handleOffsetRequest(payload) {
    const requestId = payload.requestId;
    const trackId = this.write.trackId;
    const offset = this.trackSampleOffsets[trackId] || 0;
    
    this.port.postMessage({
      event: 'offset',
      requestId,
      trackId,
      offset,
      bufferCount: this.outputBuffers.length
    });
    
    if (payload.event === 'interrupt') {
      this.hasInterrupted = true;
      if (trackId) {
        this.interruptedTrackIds[trackId] = true;
      }
      // 清空缓冲区以立即停止播放
      this.outputBuffers = [];
      this.write = { buffer: new Float32Array(this.bufferLength), trackId: null };
      this.writeOffset = 0;
    }
  }
  
  // 优化的音频数据写入
  writeAudioData(int16Array, trackId = null) {
    // 检查是否是被中断的轨道
    if (trackId && this.interruptedTrackIds[trackId]) {
      return false;
    }
    
    // Int16转Float32，包含优化和抖动
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      // 添加微小抖动减少量化噪声
      const dither = (Math.random() - 0.5) * (1.0 / 32768.0);
      float32Array[i] = (int16Array[i] / 32768.0) + dither;
    }
    
    let { buffer } = this.write;
    let offset = this.writeOffset;
    
    for (let i = 0; i < float32Array.length; i++) {
      buffer[offset++] = float32Array[i];
      
      if (offset >= buffer.length) {
        // 缓冲区已满，推入输出队列
        this.outputBuffers.push(this.write);
        
        // 自适应缓冲区管理
        if (this.adaptiveBuffering && this.outputBuffers.length > this.maxBufferSize) {
          // 如果缓冲区过多，跳过一些以减少延迟
          this.outputBuffers.splice(0, this.outputBuffers.length - this.maxBufferSize);
        }
        
        this.write = { buffer: new Float32Array(this.bufferLength), trackId };
        buffer = this.write.buffer;
        offset = 0;
      }
    }
    
    this.writeOffset = offset;
    return true;
  }
  
  // 交叉淡化处理
  applyCrossfade(currentBuffer, previousLevel, targetLevel) {
    const fadeSamples = Math.min(this.crossfadeSamples, currentBuffer.length);
    
    for (let i = 0; i < fadeSamples; i++) {
      const fadeRatio = i / fadeSamples;
      const level = previousLevel * (1 - fadeRatio) + targetLevel * fadeRatio;
      currentBuffer[i] *= level;
    }
    
    // 平滑剩余部分
    for (let i = fadeSamples; i < currentBuffer.length; i++) {
      currentBuffer[i] *= targetLevel;
    }
    
    return targetLevel;
  }
  
  // 检测音频级别
  detectAudioLevel(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }
  
  // 主处理循环
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputChannelData = output[0];
    
    // 检查中断
    if (this.hasInterrupted) {
      // 应用快速淡出避免爆音
      for (let i = 0; i < outputChannelData.length; i++) {
        const fadeOut = 1.0 - (i / outputChannelData.length);
        outputChannelData[i] = this.lastOutputLevel * fadeOut;
      }
      this.lastOutputLevel = 0;
      this.port.postMessage({ event: 'stop' });
      return false;
    }
    
    // 处理音频输出
    if (this.outputBuffers.length > 0) {
      this.hasStarted = true;
      const { buffer, trackId } = this.outputBuffers.shift();
      
      // 检测当前缓冲区音频级别
      const currentLevel = this.detectAudioLevel(buffer);
      
      // 应用平滑和交叉淡化
      this.targetOutputLevel = currentLevel;
      const smoothedLevel = this.lastOutputLevel * this.levelSmoothingFactor + 
                           this.targetOutputLevel * (1 - this.levelSmoothingFactor);
      
      // 复制音频数据
      for (let i = 0; i < outputChannelData.length; i++) {
        if (i < buffer.length) {
          outputChannelData[i] = buffer[i];
        } else {
          outputChannelData[i] = 0;
        }
      }
      
      // 应用平滑级别调整
      if (Math.abs(smoothedLevel - this.lastOutputLevel) > 0.1) {
        this.applyCrossfade(outputChannelData, this.lastOutputLevel, smoothedLevel);
      }
      
      this.lastOutputLevel = smoothedLevel;
      
      // 更新轨道采样偏移
      if (trackId) {
        this.trackSampleOffsets[trackId] = 
          (this.trackSampleOffsets[trackId] || 0) + buffer.length;
      }
      
      // 自适应缓冲区监控
      if (this.adaptiveBuffering) {
        if (this.outputBuffers.length < this.minBufferSize) {
          this.bufferUnderrunCount++;
        }
        
        // 每1000个处理周期检查一次
        if (++this.lastBufferCheck >= 1000) {
          this.lastBufferCheck = 0;
          
          // 如果缓冲区不足频繁发生，增加最小缓冲区大小
          if (this.bufferUnderrunCount > 10) {
            this.minBufferSize = Math.min(this.minBufferSize + 1, 6);
          } else if (this.bufferUnderrunCount < 2) {
            this.minBufferSize = Math.max(this.minBufferSize - 1, 1);
          }
          
          this.bufferUnderrunCount = 0;
        }
      }
      
      return true;
    } else if (this.hasStarted) {
      // 播放完成，应用淡出
      for (let i = 0; i < outputChannelData.length; i++) {
        const fadeOut = Math.max(0, 1.0 - (i / outputChannelData.length) * 2);
        outputChannelData[i] = this.lastOutputLevel * fadeOut;
      }
      this.lastOutputLevel *= 0.5;
      
      if (this.lastOutputLevel < 0.001) {
        this.port.postMessage({ event: 'stop' });
        return false;
      }
      return true;
    } else {
      // 静音输出
      outputChannelData.fill(0);
      return true;
    }
  }
}

registerProcessor('optimized_stream_processor', OptimizedStreamProcessor);
`;

const script = new Blob([OptimizedStreamProcessorWorklet], {
  type: 'application/javascript'
});
const src = URL.createObjectURL(script);
export const OptimizedStreamProcessorSrc = src;