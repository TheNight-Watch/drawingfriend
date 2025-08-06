/**
 * 优化的WavTools库 - 专门解决实时语音对话断断续续的问题
 * 
 * 主要优化包括：
 * 1. AudioWorklet架构 - 在独立线程处理音频，避免主线程阻塞
 * 2. 智能缓冲区管理 - 自适应缓冲区大小，减少延迟和断续
 * 3. 儿童语音优化 - 针对儿童语音特点的AGC和噪声门控
 * 4. 高级中断处理 - 精确的音频中断和恢复机制
 * 5. 性能监控 - 实时监控音频质量和性能指标
 * 6. 交叉淡化 - 平滑的音频转换，避免爆音
 */

// 导入优化的组件
export { OptimizedWavRecorder } from './lib/optimized_wav_recorder.js';
export { OptimizedWavStreamPlayer } from './lib/optimized_wav_stream_player.js';

// 导入AudioWorklet源码
export { OptimizedAudioProcessorSrc } from './lib/worklets/optimized_audio_processor.js';
export { OptimizedStreamProcessorSrc } from './lib/worklets/optimized_stream_processor.js';

// 便捷的初始化函数
export function createOptimizedRealtimeAudio({
  sampleRate = 24000,
  childVoiceMode = true,
  debug = false,
  latencyOptimized = true
} = {}) {
  const recorderConfig = {
    sampleRate,
    childVoiceMode,
    debug,
    outputToSpeakers: false
  };
  
  const playerConfig = {
    sampleRate,
    debug
  };
  
  if (latencyOptimized) {
    // 低延迟优化配置
    recorderConfig.processingConfig = {
      noiseGate: childVoiceMode ? -35 : -40,
      autoGainControl: true,
      childVoiceOptimization: {
        highPassFreq: childVoiceMode ? 80 : 100,
        lowPassFreq: 8000,
        compressorRatio: 3.0,
        gainBoost: childVoiceMode ? 2.5 : 2.0
      }
    };
    
    playerConfig.bufferConfig = {
      bufferLength: 128,
      minBufferSize: 1,
      maxBufferSize: 4,
      adaptiveBuffering: true,
      crossfadeSamples: 32
    };
  }
  
  const recorder = new OptimizedWavRecorder(recorderConfig);
  const player = new OptimizedWavStreamPlayer(playerConfig);
  
  return { recorder, player };
}

// 音频质量检测工具
export class AudioQualityMonitor {
  constructor() {
    this.metrics = {
      inputLevel: 0,
      outputLevel: 0,
      latency: 0,
      bufferUnderruns: 0,
      clipCount: 0,
      noiseLevel: 0
    };
    this.callbacks = [];
  }
  
  addCallback(callback) {
    this.callbacks.push(callback);
  }
  
  updateMetrics(recorder, player) {
    if (recorder) {
      const recorderMetrics = recorder.getQualityMetrics();
      this.metrics.inputLevel = recorderMetrics.averageLevel;
      this.metrics.clipCount = recorderMetrics.clipCount;
      this.metrics.noiseLevel = recorderMetrics.silenceRatio;
    }
    
    if (player) {
      const playerMetrics = player.getPerformanceMetrics();
      this.metrics.outputLevel = playerMetrics.averageLatency;
      this.metrics.latency = playerMetrics.averageLatency;
      this.metrics.bufferUnderruns = playerMetrics.bufferUnderruns;
    }
    
    // 通知监听器
    this.callbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.warn('AudioQualityMonitor callback error:', error);
      }
    });
  }
  
  getQualityScore() {
    let score = 100;
    
    // 输入级别检查
    if (this.metrics.inputLevel < 0.1) score -= 20;
    if (this.metrics.inputLevel > 0.9) score -= 15;
    
    // 延迟检查
    if (this.metrics.latency > 100) score -= 20;
    if (this.metrics.latency > 200) score -= 30;
    
    // 缓冲区不足检查
    score -= this.metrics.bufferUnderruns * 5;
    
    // 削波检查
    score -= this.metrics.clipCount * 2;
    
    // 噪声检查
    if (this.metrics.noiseLevel > 0.8) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  getQualityStatus() {
    const score = this.getQualityScore();
    
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'critical';
  }
  
  getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.inputLevel < 0.05) {
      recommendations.push('麦克风音量过低，请检查设备设置');
    }
    
    if (this.metrics.inputLevel > 0.9) {
      recommendations.push('输入音量过高，可能导致失真');
    }
    
    if (this.metrics.latency > 150) {
      recommendations.push('延迟较高，建议使用有线连接');
    }
    
    if (this.metrics.bufferUnderruns > 5) {
      recommendations.push('音频缓冲不足，可能导致断续播放');
    }
    
    if (this.metrics.clipCount > 10) {
      recommendations.push('音频削波严重，请降低增益');
    }
    
    if (this.metrics.noiseLevel > 0.9) {
      recommendations.push('环境噪声过高，建议改善录音环境');
    }
    
    return recommendations;
  }
}

// 导出到全局（用于向后兼容）
if (typeof globalThis !== 'undefined') {
  globalThis.OptimizedRealtimeAudio = {
    OptimizedWavRecorder,
    OptimizedWavStreamPlayer,
    createOptimizedRealtimeAudio,
    AudioQualityMonitor
  };
}