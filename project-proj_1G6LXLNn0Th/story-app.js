function StoryApp() {
  try {
    const [imageAnalysis, setImageAnalysis] = React.useState(null);
    const [uploadedImageName, setUploadedImageName] = React.useState('');
    const [uploadedImageUrl, setUploadedImageUrl] = React.useState('');
    const [sessionId, setSessionId] = React.useState('');
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [searchedImages, setSearchedImages] = React.useState([]);
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [showImageModal, setShowImageModal] = React.useState(false);
    const [conversation, setConversation] = React.useState([]);
    const [isRealtimeReady, setIsRealtimeReady] = React.useState(false);

    // 生成唯一的会话ID
    const generateSessionId = () => {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    };

    React.useEffect(() => {
      // 从sessionStorage获取或生成会话ID
      const storedSessionId = sessionStorage.getItem('sessionId');
      const newSessionId = storedSessionId || generateSessionId();
      setSessionId(newSessionId);
      
      if (!storedSessionId) {
        sessionStorage.setItem('sessionId', newSessionId);
        console.log('🆕 新会话ID已生成:', newSessionId);
      } else {
        console.log('📋 使用现有会话ID:', newSessionId);
      }
      
      // 从sessionStorage加载图片分析结果
      const storedImageName = sessionStorage.getItem('uploadedImageName');
      const storedAnalysis = sessionStorage.getItem('imageAnalysis');
      const storedImageUrl = sessionStorage.getItem('uploadedImageUrl');
      
      if (storedAnalysis) {
        const analysis = JSON.parse(storedAnalysis);
        setImageAnalysis(analysis);
        setUploadedImageName(storedImageName || '');
        setUploadedImageUrl(storedImageUrl || '');
        
        console.log('📸 图片分析结果已加载:', analysis);
        console.log('🎤 实时语音对话即将开始...');
      } else {
        // 如果没有图片分析结果，跳转到上传页面
        console.log('❌ 未找到图片分析结果，跳转到上传页面');
        window.location.href = 'upload.html';
      }
    }, []);

    // 处理图片上传（包含sessionId）
    const handleImageUpload = async (file) => {
      if (!sessionId) {
        console.error('❌ 会话ID未准备好');
        return null;
      }

      try {
        setIsProcessing(true);
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('sessionId', sessionId); // 添加sessionId
        
        console.log('📤 上传图片到后端，sessionId:', sessionId);
        
        const response = await fetch('http://localhost:3000/api/upload-image', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ 图片上传成功:', data);
        
        // 注意：不再在前端展示分析结果，后端已自动添加到上下文
        setUploadedImageName(data.filename);
        setUploadedImageUrl(`http://localhost:3000${data.url}`);
        
        // 存储到sessionStorage
        sessionStorage.setItem('uploadedImageName', data.filename);
        sessionStorage.setItem('uploadedImageUrl', `http://localhost:3000${data.url}`);
        if (data.analysis) {
          sessionStorage.setItem('imageAnalysis', JSON.stringify(data.analysis));
        }
        
        setIsProcessing(false);
        return data;
        
      } catch (error) {
        console.error('❌ 图片上传失败:', error);
        setIsProcessing(false);
        return null;
      }
    };

    // 处理语音转录
    const handleTranscript = (transcript) => {
      console.log('🎤 用户说话:', transcript);
      // 可以在这里处理用户的语音输入
    };

    // 处理AI回复
    const handleAIResponse = (response) => {
      console.log('🤖 AI回复:', response);
      
      // 添加到对话历史
      setConversation(prev => [...prev, {
        type: 'ai',
        content: response,
        timestamp: new Date().toISOString()
      }]);
    };

    // 处理实时语音就绪状态
    const handleRealtimeReady = (ready) => {
      setIsRealtimeReady(ready);
      if (ready) {
        console.log('🎤 实时语音对话已准备就绪');
      }
    };

    // 搜索参考图片
    const searchReferenceImages = async (query) => {
      try {
        setIsProcessing(true);
        console.log('🔍 搜索参考图片:', query);
        
        const response = await fetch(`http://localhost:3000/api/search-images?query=${encodeURIComponent(query)}&count=12`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ 参考图片搜索成功:', data);
        
        if (data.success && data.images) {
          setSearchedImages(data.images);
        } else {
          setSearchedImages([]);
        }
        
        setIsProcessing(false);
      } catch (error) {
        console.error('❌ 搜索参考图片失败:', error);
        setSearchedImages([]);
        setIsProcessing(false);
      }
    };

    return (
      <div data-name="story-app" data-file="story-app.js">
        <ErrorBoundary>
          <div className="min-h-screen bg-[var(--background-light)]">
            <Header />
            
            <main className="container mx-auto px-4 py-8">
              <div className="max-w-6xl mx-auto">
                
                {/* 状态显示 */}
                <div className="mb-6 text-center">
                  <h1 className="text-3xl font-bold gradient-text mb-2">
                    创作你的故事
                  </h1>
                  <p className="text-[var(--text-secondary)]">
                    {!isRealtimeReady 
                      ? '正在准备实时语音对话...' 
                      : '🎤 实时语音对话已就绪，开始和AI聊天创作故事吧！'
                    }
                  </p>
                  {sessionId && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      会话ID: {sessionId}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* 左侧：实时语音对话 */}
                  <div className="space-y-6">
                    <div>
                      {/* 实时语音聊天组件 */}
                      <RealtimeVoiceChat
                        onTranscript={handleTranscript}
                        onAIResponse={handleAIResponse}
                        imageAnalysis={imageAnalysis}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                        sessionId={sessionId}
                        onReady={handleRealtimeReady}
                        mode="story"
                      />
                    </div>


                  </div>

                  {/* 右侧：图片展示和辅助功能 */}
                  <div className="space-y-6">
                    
                    {/* 当前图片展示 */}
                    {uploadedImageUrl && (
                      <div className="card">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                          <span className="mr-2">🎨</span>
                          你的画作
                        </h2>
                        <div className="text-center">
                          <img 
                            src={uploadedImageUrl} 
                            alt={uploadedImageName}
                            className="w-full max-w-md mx-auto rounded-lg shadow-lg cursor-pointer transition-transform hover:scale-105"
                            onClick={() => {
                              setSelectedImage({
                                url: uploadedImageUrl,
                                title: uploadedImageName,
                                description: imageAnalysis?.description || '你的创作'
                              });
                              setShowImageModal(true);
                            }}
                          />
                          <p className="text-sm text-[var(--text-secondary)] mt-2">
                            {uploadedImageName}
                          </p>
                        </div>
                      </div>
                    )}



                  </div>
                </div>

                {/* 底部操作按钮 */}
                <div className="mt-8 flex justify-center gap-4">
                  <button
                    onClick={() => window.location.href = 'upload.html'}
                    className="btn-secondary"
                  >
                    🔄 重新开始
                  </button>
                  
                  <button
                    onClick={() => window.location.href = 'index.html'}
                    className="btn-primary"
                  >
                    🏠 返回首页
                  </button>
                </div>
              </div>
            </main>
          </div>

          {/* 图片查看模态框 */}
          {showImageModal && selectedImage && (
            <ImageModal
              image={selectedImage}
              onClose={() => {
                setShowImageModal(false);
                setSelectedImage(null);
              }}
            />
          )}
        </ErrorBoundary>
      </div>
    );

  } catch (error) {
    console.error('StoryApp组件错误:', error);
    return (
      <div className="min-h-screen bg-[var(--background-light)] flex items-center justify-center">
        <div className="card max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">应用加载失败</h2>
          <p className="text-[var(--text-secondary)] mb-4">
            抱歉，故事创作页面遇到了问题。
          </p>
          <button
            onClick={() => window.location.href = 'index.html'}
            className="btn-primary w-full"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }
}

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<StoryApp />);