#!/usr/bin/env node

/**
 * 海绵宝宝音色训练脚本
 * 使用Step API的音色复刻功能训练海绵宝宝的声音
 */

const fs = require('fs');
const path = require('path');

// 配置
const STEP_API_KEY = process.env.STEP_API_KEY || 'YOUR_STEP_API_KEY_HERE'; // 请设置您的API密钥
const AUDIO_FILE_PATH = '/Users/liuhaifeng/Desktop/drawingfriend_app_lastlast/test-audio-48s-9s.mp3';
const SPONGEBOB_TEXT = '我准备好了！我准备好了！我是海绵宝宝！';
const SAMPLE_TEXT = '你好呀！我是海绵宝宝！';

console.log('🧽 开始海绵宝宝音色训练流程...');

/**
 * 第一步：上传音频文件到Step API
 */
async function uploadAudioFile() {
    try {
        console.log('📤 正在上传音频文件到Step API...');
        
        if (!fs.existsSync(AUDIO_FILE_PATH)) {
            throw new Error(`音频文件不存在: ${AUDIO_FILE_PATH}`);
        }
        
        // 检查文件大小
        const stats = fs.statSync(AUDIO_FILE_PATH);
        console.log(`📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // 使用streams和正确的表单格式
        const FormData = require('form-data');
        const form = new FormData();
        
        // 添加文件流
        const fileStream = fs.createReadStream(AUDIO_FILE_PATH);
        form.append('file', fileStream, {
            filename: 'spongebob-voice.mp3',
            contentType: 'audio/mpeg',
            knownLength: stats.size
        });
        form.append('purpose', 'storage');
        
        console.log('📋 表单准备完成，开始上传...');
        
        const response = await fetch('https://api.stepfun.com/v1/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STEP_API_KEY}`,
                ...form.getHeaders()
            },
            body: form
        });
        
        console.log(`📡 服务器响应状态: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 错误响应:', errorText);
            throw new Error(`文件上传失败: ${response.status} - ${errorText}`);
        }
        
        const fileData = await response.json();
        console.log('✅ 音频文件上传成功!');
        console.log('📋 文件信息:', JSON.stringify(fileData, null, 2));
        
        return fileData.id;
        
    } catch (error) {
        console.error('❌ 上传音频文件失败:', error.message);
        if (error.code) {
            console.error('错误代码:', error.code);
        }
        throw error;
    }
}

/**
 * 第二步：使用file_id训练海绵宝宝音色
 */
async function trainSpongebobVoice(fileId) {
    try {
        console.log('🎭 正在训练海绵宝宝音色...');
        
        const requestBody = {
            file_id: fileId,
            model: 'step-tts-mini', // 使用mini模型，速度更快
            text: SPONGEBOB_TEXT,
            sample_text: SAMPLE_TEXT
        };
        
        console.log('📝 训练参数:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch('https://api.stepfun.com/v1/audio/voices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STEP_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`音色训练失败: ${response.status} - ${errorText}`);
        }
        
        const voiceData = await response.json();
        console.log('✅ 海绵宝宝音色训练成功!');
        console.log('🎤 音色信息:', JSON.stringify(voiceData, null, 2));
        
        // 保存音色ID到文件
        const voiceId = voiceData.id;
        const configPath = path.join(__dirname, 'spongebob-voice-config.json');
        const config = {
            voiceId: voiceId,
            createdAt: new Date().toISOString(),
            model: requestBody.model,
            originalText: SPONGEBOB_TEXT,
            sampleText: SAMPLE_TEXT,
            duplicated: voiceData.duplicated || false
        };
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`💾 音色配置已保存到: ${configPath}`);
        
        // 如果有试听音频，保存到文件
        if (voiceData.sample_audio) {
            console.log('🔊 正在保存试听音频...');
            const audioBuffer = Buffer.from(voiceData.sample_audio, 'base64');
            const audioPath = path.join(__dirname, 'spongebob-sample.wav');
            fs.writeFileSync(audioPath, audioBuffer);
            console.log(`🎵 试听音频已保存到: ${audioPath}`);
        }
        
        return voiceId;
        
    } catch (error) {
        console.error('❌ 训练音色失败:', error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        // 检查API密钥
        if (STEP_API_KEY === 'YOUR_STEP_API_KEY_HERE' || !STEP_API_KEY) {
            console.error('❌ 请设置Step API密钥!');
            console.error('💡 设置方法: export STEP_API_KEY=your_actual_api_key');
            process.exit(1);
        }
        
        console.log('🔑 API密钥已设置');
        console.log('📁 音频文件路径:', AUDIO_FILE_PATH);
        
        // 第一步：上传音频文件
        const fileId = await uploadAudioFile();
        console.log(`📋 获得文件ID: ${fileId}`);
        
        // 第二步：训练音色
        const voiceId = await trainSpongebobVoice(fileId);
        
        console.log('\n🎉 海绵宝宝音色训练完成!');
        console.log('=' .repeat(50));
        console.log(`🎭 音色ID: ${voiceId}`);
        console.log('💡 使用方法: 在实时语音组件中将voice参数设置为:', voiceId);
        console.log('=' .repeat(50));
        
        // 提供使用建议
        console.log('\n📋 接下来的步骤:');
        console.log('1. 将音色ID复制到RealtimeVoiceChat.js中');
        console.log('2. 替换现有的voice配置');
        console.log('3. 测试海绵宝宝音色是否生效');
        
    } catch (error) {
        console.error('\n💥 训练流程失败:', error.message);
        process.exit(1);
    }
}

// 如果作为主程序运行
if (require.main === module) {
    // 引入所需模块
    const fetch = require('node-fetch');
    const FormData = require('form-data');
    
    main().catch(console.error);
}

module.exports = {
    uploadAudioFile,
    trainSpongebobVoice,
    main
};