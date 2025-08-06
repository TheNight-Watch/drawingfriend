import { OptimizedAudioProcessorSrc } from './worklets/optimized_audio_processor.js';

/**
 * 优化的音频录制器，专门解决实时语音断断续续的问题
 * 针对儿童语音特点进行了特殊优化
 * @class
 */
export class OptimizedWavRecorder {
  constructor({ 
    sampleRate = 24000, 
    outputToSpeakers = false, 
    debug = false,
    childVoiceMode = true 
  } = {}) {
    this.scriptSrc = OptimizedAudioProcessorSrc;
    this.sampleRate = sampleRate;
    this.outputToSpeakers = outputToSpeakers;
    this.debug = debug;
    this.childVoiceMode = childVoiceMode;
    
    // 状态管理
    this.stream = null;
    this.processor = null;
    this.source = null;
    this.node = null;
    this.analyser = null;
    this.recording = false;
    this.connected = false;
    
    // 事件处理优化
    this._lastEventId = 0;
    this.eventReceipts = {};
    this.eventTimeout = 3000; // 减少超时时间
    
    // 音频处理配置
    this.processingConfig = {
      noiseGate: childVoiceMode ? -35 : -40,
      autoGainControl: true,
      childVoiceOptimization: {
        highPassFreq: childVoiceMode ? 80 : 100,
        lowPassFreq: childVoiceMode ? 8000 : 8000,
        compressorRatio: childVoiceMode ? 3.0 : 4.0,
        gainBoost: childVoiceMode ? 2.5 : 2.0
      }
    };
    
    // 音频块处理
    this._chunkProcessor = () => {};
    this._chunkProcessorSize = 4096; // 较小的块大小以减少延迟
    this._chunkProcessorBuffer = {
      raw: new ArrayBuffer(0),
      mono: new ArrayBuffer(0)
    };
    
    // 质量监控
    this.qualityMetrics = {
      averageLevel: 0,
      peakLevel: 0,
      clipCount: 0,
      silenceRatio: 0,
      lastUpdate: Date.now()
    };
  }
  
  /**
   * 记录调试日志
   */
  log(...args) {
    if (this.debug) {
      console.log('[OptimizedWavRecorder]', ...args);
    }
  }
  
  /**
   * 发送事件到AudioWorklet
   */
  async _event(name, data = {}, _processor = null) {
    _processor = _processor || this.processor;
    if (!_processor) {
      throw new Error('录音器未初始化，请先调用 begin()');
    }
    
    const message = {
      event: name,
      data: { ...data, id: this._lastEventId++ }
    };
    
    _processor.port.postMessage(message);
    
    const startTime = Date.now();
    while (!this.eventReceipts[message.data.id]) {
      if (Date.now() - startTime > this.eventTimeout) {
        throw new Error(`事件 "${name}" 超时`);
      }
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const result = this.eventReceipts[message.data.id];
    delete this.eventReceipts[message.data.id];
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  }
  
  /**
   * 获取当前录音状态
   */
  getStatus() {
    if (!this.processor || !this.connected) {
      return 'ended';
    } else if (!this.recording) {
      return 'paused';
    } else {
      return 'recording';
    }
  }
  
  /**
   * 获取音频质量指标
   */
  getQualityMetrics() {
    return { ...this.qualityMetrics };
  }
  
  /**
   * 更新处理配置
   */
  async updateProcessingConfig(config) {
    Object.assign(this.processingConfig, config);
    
    if (this.processor) {
      try {
        await this._event('updateSettings', { 
          settings: this.processingConfig 
        });
        this.log('音频处理配置已更新', config);
      } catch (error) {
        this.log('更新配置失败:', error);
      }
    }
  }
  
  /**
   * 请求麦克风权限
   */
  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // 我们使用自己的AGC
        }
      });
      
      // 立即停止流，只是为了获取权限
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      this.log('获取麦克风权限失败:', error);
      throw new Error('无法获取麦克风权限，请检查浏览器设置');
    }
  }
  
  /**
   * 初始化录音器
   */
  async begin(deviceId = null) {
    if (this.processor) {
      throw new Error('录音器已连接，请先调用 end() 结束当前会话');
    }
    
    this.log('开始初始化录音器...');
    
    try {
      // 1. 获取媒体流
      const audioConfig = {
        sampleRate: this.sampleRate,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: this.childVoiceMode ? false : true, // 儿童模式关闭降噪
        autoGainControl: false
      };
      
      if (deviceId) {
        audioConfig.deviceId = { exact: deviceId };
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConfig
      });
      
      // 2. 创建音频上下文
      const context = new AudioContext({ 
        sampleRate: this.sampleRate,
        latencyHint: 'interactive' // 低延迟模式
      });
      
      if (context.state === 'suspended') {
        await context.resume();
      }
      
      // 3. 加载AudioWorklet
      try {
        await context.audioWorklet.addModule(this.scriptSrc);
      } catch (error) {
        this.log('AudioWorklet加载失败:', error);
        throw new Error('无法加载音频处理模块');
      }
      
      // 4. 创建音频节点
      const source = context.createMediaStreamSource(this.stream);
      const processor = new AudioWorkletNode(context, 'optimized_audio_processor');
      const analyser = context.createAnalyser();
      
      // 配置分析器
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      // 5. 连接音频图
      source.connect(processor);
      processor.connect(analyser);
      
      if (this.outputToSpeakers) {
        this.log('警告: 启用扬声器输出可能导致回音');
        analyser.connect(context.destination);
      }
      
      // 6. 设置事件处理
      processor.port.onmessage = (e) => {
        const { event, id, data } = e.data;
        
        if (event === 'receipt') {
          this.eventReceipts[id] = data;
        } else if (event === 'chunk') {
          this.handleAudioChunk(data);
        }
      };
      
      // 7. 发送初始配置
      await this._event('updateSettings', { 
        settings: this.processingConfig 
      }, processor);
      
      this.source = source;
      this.processor = processor;
      this.node = processor;
      this.analyser = analyser;
      this.connected = true;
      
      this.log('录音器初始化成功');
      return true;
      
    } catch (error) {
      this.log('录音器初始化失败:', error);
      await this.cleanup();
      throw error;
    }
  }
  
  /**
   * 处理音频块
   */
  handleAudioChunk(data) {
    const { raw, mono, level, gain } = data;
    
    // 更新质量指标
    this.updateQualityMetrics(level, gain);
    
    // 处理音频数据
    if (this._chunkProcessorSize) {
      this._chunkProcessorBuffer = {
        raw: this.mergeBuffers(this._chunkProcessorBuffer.raw, raw),
        mono: this.mergeBuffers(this._chunkProcessorBuffer.mono, mono)
      };
      
      if (this._chunkProcessorBuffer.mono.byteLength >= this._chunkProcessorSize) {
        this._chunkProcessor(this._chunkProcessorBuffer);
        this._chunkProcessorBuffer = {
          raw: new ArrayBuffer(0),
          mono: new ArrayBuffer(0)
        };
      }
    } else {
      this._chunkProcessor({ raw, mono });
    }
  }
  
  /**
   * 更新音频质量指标
   */
  updateQualityMetrics(level, gain) {
    const now = Date.now();
    const timeDelta = now - this.qualityMetrics.lastUpdate;
    
    if (timeDelta > 100) { // 每100ms更新一次
      this.qualityMetrics.averageLevel = level;
      this.qualityMetrics.peakLevel = Math.max(this.qualityMetrics.peakLevel * 0.95, level);
      
      if (level > 0.95) {
        this.qualityMetrics.clipCount++;
      }
      
      this.qualityMetrics.silenceRatio = level < 0.01 ? 
        this.qualityMetrics.silenceRatio * 0.9 + 0.1 :
        this.qualityMetrics.silenceRatio * 0.9;
        
      this.qualityMetrics.lastUpdate = now;
      
      // 自适应配置调整
      if (this.qualityMetrics.clipCount > 5) {
        this.updateProcessingConfig({
          childVoiceOptimization: {
            ...this.processingConfig.childVoiceOptimization,
            gainBoost: Math.max(1.0, this.processingConfig.childVoiceOptimization.gainBoost - 0.1)
          }
        });
        this.qualityMetrics.clipCount = 0;
      }
    }
  }
  
  /**
   * 合并ArrayBuffer
   */
  mergeBuffers(buffer1, buffer2) {
    const merged = new ArrayBuffer(buffer1.byteLength + buffer2.byteLength);
    const view = new Uint8Array(merged);
    view.set(new Uint8Array(buffer1), 0);
    view.set(new Uint8Array(buffer2), buffer1.byteLength);
    return merged;
  }
  
  /**
   * 开始录音
   */
  async record(chunkProcessor = () => {}, chunkSize = 4096) {
    if (!this.processor || !this.connected) {
      throw new Error('录音器未准备好，请先调用 begin()');
    }
    
    if (this.recording) {
      throw new Error('已在录音中，请先调用 pause()');
    }
    
    if (typeof chunkProcessor !== 'function') {
      throw new Error('chunkProcessor 必须是函数');
    }
    
    this._chunkProcessor = chunkProcessor;
    this._chunkProcessorSize = chunkSize;
    this._chunkProcessorBuffer = {
      raw: new ArrayBuffer(0),
      mono: new ArrayBuffer(0)
    };
    
    this.log('开始录音...');
    await this._event('start');
    this.recording = true;
    return true;
  }
  
  /**
   * 暂停录音
   */
  async pause() {
    if (!this.recording) {
      throw new Error('未在录音，无需暂停');
    }
    
    // 处理剩余缓冲区
    if (this._chunkProcessorBuffer.mono.byteLength > 0) {
      this._chunkProcessor(this._chunkProcessorBuffer);
      this._chunkProcessorBuffer = {
        raw: new ArrayBuffer(0),
        mono: new ArrayBuffer(0)
      };
    }
    
    this.log('暂停录音...');
    await this._event('stop');
    this.recording = false;
    return true;
  }
  
  /**
   * 清理资源
   */
  async cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    this.node = null;
    this.recording = false;
    this.connected = false;
  }
  
  /**
   * 结束录音会话
   */
  async end() {
    if (!this.processor || !this.connected) {
      throw new Error('录音器未连接');
    }
    
    if (this.recording) {
      await this.pause();
    }
    
    this.log('结束录音会话...');
    await this.cleanup();
    return true;
  }
}

// 导出到全局
globalThis.OptimizedWavRecorder = OptimizedWavRecorder;