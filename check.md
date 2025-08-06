2.2 Audio Processing Components
2.2 音频处理组件
WavRecorder
Handles microphone input and audio recording:
处理麦克风输入和音频录制：

Initialized with a sample rate of 24000 Hz
以 24000 Hz 的采样率初始化
Provides methods for starting, pausing, and stopping recording
提供开始、暂停和停止录制的方法
Delivers audio data through callbacks
通过回调传递音频数据
WavStreamPlayer
Manages audio playback from the AI:
管理从 AI 播放音频

Plays audio responses received from the server
播放从服务器接收到的音频响应
Supports interruption when the user starts speaking
支持用户开始说话时中断
Takes 16-bit PCM audio data as input
以 16 位 PCM 音频数据为输入
WaveSurfer
Visualizes audio waveforms for playback:
可视化音频波形以供播放：

Integrated via Svelte actions
通过 Svelte 动作集成
Provides audio playback controls
提供音频播放控制
Displays waveform visualization for recorded messages
显示录制消息的波形可视化
Sources: 
src/routes/+page.svelte
26-29
 
src/routes/+page.svelte
423-489
 
src/routes/+page.svelte
491-503

来源：src/routes/+page.svelte26-29src/routes/+page.svelte423-489src/routes/+page.svelte491-503

2.3 API Communication Component
2.3 API 通信组件
The RealtimeClient class handles communication with the Stepfun API:
RealtimeClient 类负责与 Stepfun API 进行通信：

Establishes WebSocket connections to the backend
建立与后端的 WebSocket 连接
Sends audio data to the server
向服务器发送音频数据
Receives AI responses (text and audio)
接收 AI 响应（文本和音频）
Manages the conversation state
管理对话状态
Sources: 
src/routes/+page.svelte
148-252
 
src/routes/+page.svelte
257-332

来源：src/routes/+page.svelte148-252src/routes/+page.svelte257-332

3. State Management  3. 状态管理
The frontend uses Svelte 5's reactive state management system with $state variables. Key state variables include:
前端使用 Svelte 5 的响应式状态管理系统和 $state 变量。关键状态变量包括：

Variable  变量	Type  类型	Purpose  用途
client	RealtimeClient  实时客户端	API communication client  API 通信客户端
wavRecorder	WavRecorder  音频录制器	Audio recording functionality
音频录制功能
wavStreamPlayer	WavStreamPlayer	Audio playback functionality
音频播放功能
items	Array	Conversation messages  对话消息
realtimeEvents	Array  数组	Event logs for debugging  调试事件日志
isConnected	boolean  布尔值	Connection status  连接状态
isRecording	boolean  布尔值	Recording status  录制状态
isAISpeaking	boolean  布尔值	AI speaking status  AI 说话状态
selectedVoice	object  对象	Selected voice for the AI
为 AI 选择的语音
conversationalMode	string  字符串	'manual' or 'realtime' (VAD)
'manual' 或 'realtime' (VAD)
temperature	number  数字	Model temperature parameter
模型温度参数
instructions	string  字符串	System instructions for the AI
AI 的系统指令
Sources: 
src/routes/+page.svelte
28-55

来源：src/routes/+page.svelte28-55