import { OptimizedStreamProcessorSrc } from './worklets/optimized_stream_processor.js';

/**
 * 优化的音频流播放器，解决播放断断续续和延迟问题
 * 专门针对实时语音对话场景优化
 * @class
 */
export class OptimizedWavStreamPlayer {
  constructor({ sampleRate = 24000, debug = false } = {}) {
    this.scriptSrc = OptimizedStreamProcessorSrc;
    this.sampleRate = sampleRate;
    this.debug = debug;
    
    // 音频上下文和节点
    this.context = null;
    this.stream = null;
    this.analyser = null;
    
    // 轨道管理
    this.trackSampleOffsets = {};
    this.interruptedTrackIds = {};
    this.currentTrackId = null;
    
    // 缓冲区管理
    this.bufferConfig = {
      bufferLength: 128,
      minBufferSize: 2,
      maxBufferSize: 6,
      adaptiveBuffering: true,
      crossfadeSamples: 64
    };
    
    // 性能监控
    this.performanceMetrics = {
      bufferUnderruns: 0,
      averageLatency: 0,
      peakLatency: 0,
      totalSamplesPlayed: 0,
      playbackStartTime: 0,
      lastMetricsUpdate: Date.now()
    };
    
    // 连接状态
    this.connected = false;
    this.playing = false;
  }
  
  /**
   * 记录调试日志
   */
  log(...args) {
    if (this.debug) {
      console.log('[OptimizedWavStreamPlayer]', ...args);
    }
  }
  
  /**
   * 连接音频上下文
   */
  async connect() {
    if (this.connected) {
      this.log('已连接，跳过重复连接');
      return true;
    }
    
    this.log('连接音频上下文...');
    
    try {
      // 创建音频上下文
      this.context = new AudioContext({ 
        sampleRate: this.sampleRate,
        latencyHint: 'interactive'
      });
      
      // 恢复音频上下文（如果被暂停）
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      
      // 加载AudioWorklet
      try {
        await this.context.audioWorklet.addModule(this.scriptSrc);
      } catch (error) {
        this.log('AudioWorklet加载失败:', error);
        throw new Error('无法加载音频播放模块');
      }
      
      // 创建分析器
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      this.analyser = analyser;
      
      this.connected = true;
      this.log('音频上下文连接成功');
      
      return true;
    } catch (error) {
      this.log('连接失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新播放器配置
   */
  async updateConfig(config) {
    Object.assign(this.bufferConfig, config);
    
    if (this.stream) {
      this.stream.port.postMessage({
        event: 'updateSettings',
        settings: this.bufferConfig
      });
    }
    
    this.log('播放器配置已更新:', config);
  }
  
  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
  
  /**
   * 启动音频流
   */
  _startStream() {
    if (this.stream) {
      this.log('音频流已存在');
      return this.stream;
    }
    
    this.log('启动音频流...');
    
    try {
      // 创建AudioWorklet节点
      const streamNode = new AudioWorkletNode(this.context, 'optimized_stream_processor');
      
      // 连接到输出和分析器
      streamNode.connect(this.context.destination);
      if (this.analyser) {
        this.analyser.disconnect();
        streamNode.connect(this.analyser);
      }
      
      // 设置消息处理
      streamNode.port.onmessage = (e) => {
        const { event } = e.data;
        
        if (event === 'stop') {
          this._stopStream();
        } else if (event === 'offset') {
          const { requestId, trackId, offset, bufferCount } = e.data;
          const currentTime = offset / this.sampleRate;
          this.trackSampleOffsets[requestId] = { trackId, offset, currentTime, bufferCount };
          
          // 更新性能指标
          this.updatePerformanceMetrics(bufferCount);
        }
      };
      
      // 发送初始配置
      streamNode.port.postMessage({
        event: 'updateSettings',
        settings: this.bufferConfig
      });
      
      this.stream = streamNode;
      this.playing = true;
      this.performanceMetrics.playbackStartTime = Date.now();
      
      this.log('音频流启动成功');
      return streamNode;
      
    } catch (error) {
      this.log('音频流启动失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止音频流
   */
  _stopStream() {
    if (this.stream) {
      this.log('停止音频流...');
      this.stream.disconnect();
      this.stream = null;
      this.playing = false;
    }
  }
  
  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(bufferCount) {
    const now = Date.now();
    const timeDelta = now - this.performanceMetrics.lastMetricsUpdate;
    
    if (timeDelta > 1000) { // 每秒更新一次
      // 计算延迟
      const latency = bufferCount * this.bufferConfig.bufferLength / this.sampleRate * 1000;
      this.performanceMetrics.averageLatency = 
        this.performanceMetrics.averageLatency * 0.9 + latency * 0.1;
      this.performanceMetrics.peakLatency = 
        Math.max(this.performanceMetrics.peakLatency * 0.99, latency);
      
      // 检测缓冲区不足
      if (bufferCount < this.bufferConfig.minBufferSize) {
        this.performanceMetrics.bufferUnderruns++;
      }
      
      this.performanceMetrics.lastMetricsUpdate = now;
      
      // 自适应调整
      if (this.bufferConfig.adaptiveBuffering) {
        if (this.performanceMetrics.bufferUnderruns > 3) {
          this.updateConfig({ minBufferSize: Math.min(this.bufferConfig.minBufferSize + 1, 4) });
        } else if (this.performanceMetrics.averageLatency > 100) {
          this.updateConfig({ maxBufferSize: Math.max(this.bufferConfig.maxBufferSize - 1, 3) });
        }
      }
    }
  }
  
  /**
   * 添加16位PCM音频数据
   */
  add16BitPCM(arrayBuffer, trackId = 'default') {
    if (!this.connected) {
      throw new Error('播放器未连接，请先调用 connect()');
    }
    
    if (typeof trackId !== 'string') {
      throw new Error('trackId 必须是字符串');
    }
    
    // 检查是否是被中断的轨道
    if (this.interruptedTrackIds[trackId]) {
      this.log(`跳过被中断的轨道: ${trackId}`);
      return null;
    }
    
    // 启动流（如果需要）
    if (!this.stream) {
      this._startStream();
    }
    
    // 处理音频数据
    let buffer;
    if (arrayBuffer instanceof Int16Array) {
      buffer = arrayBuffer;
    } else if (arrayBuffer instanceof ArrayBuffer) {
      buffer = new Int16Array(arrayBuffer);
    } else {
      throw new Error('数据必须是 Int16Array 或 ArrayBuffer');
    }
    
    // 发送到AudioWorklet
    try {
      this.stream.port.postMessage({ 
        event: 'write', 
        buffer: buffer, 
        trackId: trackId 
      });
      
      this.currentTrackId = trackId;
      this.performanceMetrics.totalSamplesPlayed += buffer.length;
      
    } catch (error) {
      this.log('发送音频数据失败:', error);
      throw error;
    }
    
    return buffer;
  }
  
  /**
   * 获取当前播放位置偏移
   */
  async getTrackSampleOffset(interrupt = false) {
    if (!this.stream) {
      return null;
    }
    
    const requestId = crypto.randomUUID();
    
    try {
      this.stream.port.postMessage({
        event: interrupt ? 'interrupt' : 'offset',
        requestId: requestId
      });
      
      // 等待响应（带超时）
      const startTime = Date.now();
      const timeout = 1000; // 1秒超时
      
      let trackSampleOffset;
      while (!trackSampleOffset && Date.now() - startTime < timeout) {
        trackSampleOffset = this.trackSampleOffsets[requestId];
        if (!trackSampleOffset) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      if (!trackSampleOffset) {
        this.log('获取播放偏移超时');
        return null;
      }
      
      // 清理
      delete this.trackSampleOffsets[requestId];
      
      const { trackId } = trackSampleOffset;
      if (interrupt && trackId) {
        this.interruptedTrackIds[trackId] = true;
        this.log(`标记轨道为中断: ${trackId}`);
      }
      
      return trackSampleOffset;
      
    } catch (error) {
      this.log('获取播放偏移失败:', error);
      return null;
    }
  }
  
  /**
   * 中断当前播放
   */
  async interrupt() {
    this.log('中断播放...');
    
    const result = await this.getTrackSampleOffset(true);
    
    // 强制停止流
    this._stopStream();
    
    // 清理中断的轨道ID（延迟清理）
    setTimeout(() => {
      this.interruptedTrackIds = {};
    }, 100);
    
    return result;
  }
  
  /**
   * 获取音频频域数据
   */
  getFrequencies(analysisType = 'frequency', minDecibels = -100, maxDecibels = -30) {
    if (!this.analyser) {
      throw new Error('分析器未初始化，请先调用 connect()');
    }
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    if (analysisType === 'frequency') {
      this.analyser.getByteFrequencyData(dataArray);
    } else {
      this.analyser.getByteTimeDomainData(dataArray);
    }
    
    return {
      values: dataArray,
      type: analysisType,
      sampleRate: this.sampleRate,
      minDecibels,
      maxDecibels
    };
  }
  
  /**
   * 断开连接并清理资源
   */
  async disconnect() {
    this.log('断开连接...');
    
    // 停止流
    this._stopStream();
    
    // 清理分析器
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    // 关闭音频上下文
    if (this.context && this.context.state !== 'closed') {
      await this.context.close();
    }
    
    this.context = null;
    this.connected = false;
    this.trackSampleOffsets = {};
    this.interruptedTrackIds = {};
    this.currentTrackId = null;
    
    this.log('连接已断开');
  }
  
  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      connected: this.connected,
      playing: this.playing,
      currentTrackId: this.currentTrackId,
      contextState: this.context?.state,
      bufferConfig: this.bufferConfig,
      performanceMetrics: this.getPerformanceMetrics()
    };
  }
}

// 导出到全局
globalThis.OptimizedWavStreamPlayer = OptimizedWavStreamPlayer;