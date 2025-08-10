function HomeApp() {
  try {
    const [currentMode, setCurrentMode] = React.useState('home'); // 'home', 'product-intro', 'story-start', 'ask-ai'
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [sessionId, setSessionId] = React.useState('');
    const [isVoiceChatReady, setIsVoiceChatReady] = React.useState(false);
    const [hasTheme, setHasTheme] = React.useState(null); // null, true, false
    const [themeConversationStep, setThemeConversationStep] = React.useState(0); // 0: 询问主题, 1: 处理回答, 2: 完成
    const [searchImages, setSearchImages] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchKeyword, setSearchKeyword] = React.useState('');
    const [showImageSearchOverlay, setShowImageSearchOverlay] = React.useState(false);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // 生成会话ID
    React.useEffect(() => {
      const newSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      setSessionId(newSessionId);
      sessionStorage.setItem('sessionId', newSessionId);
      console.log('🆕 首页会话ID已生成:', newSessionId);
    }, []);

    // 产品介绍功能
    const handleProductIntro = async () => {
      setCurrentMode('product-intro');
      setIsSpeaking(true);
      
      try {
        const introText = "这是一个可以帮助你通过绘画表达自己内心想法的互动工具，在你完成后，画面还能根据你的故事动起来哦。";
        
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(introText);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.9;
          utterance.onend = () => {
            setIsSpeaking(false);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(() => {
            setIsSpeaking(false);
          }, 5000);
        }
      } catch (error) {
        console.error('产品介绍语音播放失败:', error);
        setIsSpeaking(false);
      }
    };

    // 开始故事功能
    const handleStoryStart = () => {
      setCurrentMode('story-start');
      setThemeConversationStep(0);
      setHasTheme(null);
    };

    // 向AI提问功能
    const handleAskAI = () => {
      setCurrentMode('ask-ai');
    };

    // 画完了按钮 - 跳转到上传页面
    const handleDrawingComplete = () => {
      // 存储绘画完成状态
      sessionStorage.setItem('drawingCompleted', 'true');
      sessionStorage.setItem('sessionId', sessionId);
      window.location.href = 'upload.html';
    };

    // 返回首页
    const resetToHome = () => {
      setCurrentMode('home');
      setIsSpeaking(false);
      setHasTheme(null);
      setThemeConversationStep(0);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    // 处理语音转录
    const handleTranscript = (transcript) => {
      console.log('🎤 用户说话:', transcript);
    };

    // 处理AI回复
    const handleAIResponse = (response) => {
      console.log('🤖 AI回复:', response);
      
      // 检测图片搜索触发词
      const searchPattern = /\[SEARCH:([^\]]+)\]/g;
      let match;
      const foundKeywords = [];
      
      while ((match = searchPattern.exec(response)) !== null) {
        const keyword = match[1].trim();
        foundKeywords.push(keyword);
      }
      
      if (foundKeywords.length > 0) {
        console.log('🔍 检测到搜索触发词:', foundKeywords[0]);
        triggerImageSearch(foundKeywords[0]);
        
        // 清理AI回复文本，移除搜索标记
        const cleanedResponse = response.replace(searchPattern, '');
        // 可以在这里处理清理后的回复
      }
    };

    // 触发图片搜索
    const triggerImageSearch = async (keyword) => {
      setIsSearching(true);
      setSearchKeyword(keyword);
      setShowImageSearchOverlay(true);
      setCurrentImageIndex(0); // 重置轮播图索引
      
      try {
        console.log('🖼️ 开始搜索图片:', keyword);
        
        const response = await fetch(
          `http://localhost:3000/api/search-images?keyword=${encodeURIComponent(keyword)}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.images) {
          setSearchImages(data.images);
          console.log('✅ 图片搜索完成，找到', data.images.length, '张图片');
        } else {
          console.warn('⚠️ 搜索结果为空');
          setSearchImages([]);
        }
        
      } catch (error) {
        console.error('❌ 图片搜索失败:', error);
        setSearchImages([]);
      } finally {
        setIsSearching(false);
      }
    };

    // 关闭图片搜索覆盖层
    const closeImageSearchOverlay = () => {
      setShowImageSearchOverlay(false);
      setSearchImages([]);
      setSearchKeyword('');
      setIsSearching(false);
      setCurrentImageIndex(0);
    };

    // 处理实时语音就绪状态
    const handleVoiceChatReady = (ready) => {
      setIsVoiceChatReady(ready);
      console.log('🎤 首页语音对话就绪状态:', ready);
    };

    return (
      <div className="min-h-screen bg-[var(--background-light)]" data-name="home-app" data-file="home-app.js">
        <Header />
        
        <main className="container mx-auto px-4 pt-16 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Virtual Character Section */}
            <div className="mb-16">
              <div className="text-center">
                {/* Character Avatar */}
                <div className={`w-48 h-48 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'animate-pulse scale-110' : 'scale-100'}`}>
                  <div className="icon-smile text-8xl text-white"></div>
                </div>
                
                <h1 className="text-4xl font-bold gradient-text mb-4">
                  AI故事小助手
                </h1>
                <p className="text-[var(--text-secondary)] text-lg mb-8">
                  你好！我是你的故事创作伙伴
                </p>
              </div>
            </div>

            {/* 主页四个核心按钮 */}
            {currentMode === 'home' && (
              <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* 产品介绍按钮 */}
                <button 
                  onClick={handleProductIntro}
                  className="btn-primary text-lg px-8 py-6 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform text-center"
                >
                  <div className="text-3xl">ℹ️</div>
                  <span>产品介绍</span>
                </button>
                
                {/* 开始故事按钮 */}
                <button 
                  onClick={handleStoryStart}
                  className="btn-primary text-lg px-8 py-6 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform text-center"
                >
                  <div className="text-3xl">▶️</div>
                  <span>开始故事</span>
                </button>
                
                {/* 向我提问按钮 */}
                <button 
                  onClick={handleAskAI}
                  className="btn-primary text-lg px-8 py-6 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform text-center"
                >
                  <div className="text-3xl">❓</div>
                  <span>向我提问</span>
                </button>
                
                {/* 画完了按钮 */}
                <button 
                  onClick={handleDrawingComplete}
                  className="btn-primary text-lg px-8 py-6 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform text-center"
                >
                  <div className="text-3xl">✅</div>
                  <span>画完了</span>
                </button>
              </div>
            )}

            {/* 产品介绍模式 */}
            {currentMode === 'product-intro' && (
              <div className="text-center space-y-6">
                <div className="card max-w-2xl mx-auto">
                  <div className="flex items-center justify-center mb-4">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'animate-pulse scale-110' : 'scale-100'}`}>
                      <div className="icon-volume-2 text-2xl text-white"></div>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-4">产品介绍</h2>
                  <p className="text-[var(--text-secondary)] mb-6">
                    {isSpeaking ? "正在为你介绍..." : "这是一个可以帮助你通过绘画表达自己内心想法的互动工具，在你完成后，画面还能根据你的故事动起来哦。"}
                  </p>
                  
                  <div className="flex gap-4 justify-center">
                    <button 
                      onClick={resetToHome}
                      className="btn-secondary px-6 py-3"
                      disabled={isSpeaking}
                    >
                      返回首页
                    </button>
                    {!isSpeaking && (
                      <button 
                        onClick={handleStoryStart}
                        className="btn-primary px-6 py-3"
                      >
                        开始故事创作
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}


          </div>
        </main>

        {/* 开始故事模式 - 主题设置对话 */}
        {currentMode === 'story-start' && (
          <div className="max-w-4xl mx-auto">
            <div className="card">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-4">开始你的故事创作</h2>
                <p className="text-[var(--text-secondary)]">
                  让我们先聊聊你想画的主题吧！
                </p>
              </div>
              
              {/* 集成实时语音对话 */}
              <RealtimeVoiceChat
                onTranscript={handleTranscript}
                onAIResponse={handleAIResponse}
                sessionId={sessionId}
                onReady={handleVoiceChatReady}
                mode="theme-setting"
              />
              
              <div className="text-center mt-6">
                <button 
                  onClick={resetToHome}
                  className="btn-secondary px-6 py-3"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 向AI提问模式 */}
        {currentMode === 'ask-ai' && (
          <div className="max-w-4xl mx-auto">
            <div className="card">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-4">向AI提问</h2>
                <p className="text-[var(--text-secondary)]">
                  有什么绘画问题或者需要引导的地方吗？我来帮助你！
                </p>
              </div>
              
              {/* 集成实时语音对话 */}
              <RealtimeVoiceChat
                onTranscript={handleTranscript}
                onAIResponse={handleAIResponse}
                sessionId={sessionId}
                onReady={handleVoiceChatReady}
                mode="guidance"
              />
              
              <div className="text-center mt-6">
                <button 
                  onClick={resetToHome}
                  className="btn-secondary px-6 py-3"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 图片搜索结果覆盖层 */}
        {showImageSearchOverlay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                {/* 标题栏 */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[var(--primary-color)]">
                    📸 参考图片 {searchKeyword && `- ${searchKeyword}`}
                  </h2>
                  <button 
                    onClick={closeImageSearchOverlay}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>
                
                {/* 搜索状态或结果 */}
                {isSearching ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
                    <p className="text-lg text-[var(--text-secondary)]">正在搜索图片...</p>
                  </div>
                ) : searchImages.length > 0 && (
                  <div className="relative">
                    {/* 轮播图主体 */}
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={searchImages[currentImageIndex]?.url} 
                        alt={searchImages[currentImageIndex]?.alt || `${searchKeyword}参考图片`}
                        className="w-full h-96 object-cover cursor-pointer transition-opacity duration-300"
                        onClick={() => {
                          // 点击图片可以在新窗口打开
                          if (searchImages[currentImageIndex]?.photographer_url) {
                            window.open(searchImages[currentImageIndex].photographer_url, '_blank');
                          }
                        }}
                      />
                      
                      {/* 摄影师信息覆盖层 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-sm">
                          📷 摄影师：{searchImages[currentImageIndex]?.photographer}
                        </p>
                      </div>
                    </div>
                    
                    {/* 左右切换按钮 */}
                    {searchImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === 0 ? searchImages.length - 1 : prev - 1
                          )}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 text-xl font-bold"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === searchImages.length - 1 ? 0 : prev + 1
                          )}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 text-xl font-bold"
                        >
                          →
                        </button>
                      </>
                    )}
                    
                    {/* 底部指示器和缩略图 */}
                    {searchImages.length > 1 && (
                      <div className="mt-6">
                        <div className="flex justify-center gap-2 mb-4">
                          {searchImages.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                                currentImageIndex === index 
                                  ? 'bg-[var(--primary-color)]' 
                                  : 'bg-gray-300 hover:bg-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                        
                        {/* 缩略图导航 */}
                        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                          {searchImages.map((image, index) => (
                            <button
                              key={image.id || index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all duration-200 ${
                                currentImageIndex === index 
                                  ? 'border-[var(--primary-color)] scale-110' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <img 
                                src={image.url}
                                alt={image.alt || `${searchKeyword}参考图片`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                        
                        {/* 计数器 */}
                        <div className="text-center mt-4">
                          <span className="text-lg text-[var(--text-primary)] font-medium">
                            {currentImageIndex + 1} / {searchImages.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 底部说明 */}
                {searchImages.length > 0 && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                      这些图片可以作为绘画参考，点击图片查看摄影师主页
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      图片来源：Unsplash.com
                    </p>
                  </div>
                )}
                
                {/* 关闭按钮 */}
                <div className="mt-6 text-center">
                  <button 
                    onClick={closeImageSearchOverlay}
                    className="btn-primary px-6 py-3"
                  >
                    继续绘画创作
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('HomeApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <HomeApp />
  </ErrorBoundary>
);