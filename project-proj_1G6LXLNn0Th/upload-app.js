function UploadApp() {
  try {
    const [uploadedImage, setUploadedImage] = React.useState(null);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [sessionId, setSessionId] = React.useState('');

    // 生成会话ID
    React.useEffect(() => {
      const newSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      setSessionId(newSessionId);
      console.log('🎯 会话ID已生成:', newSessionId);
    }, []);

    const handleImageUpload = async (imageFile) => {
      if (!sessionId) {
        console.error('❌ 会话ID未准备好');
        return;
      }

      try {
        setUploadedImage(imageFile);
        setIsAnalyzing(true);
        
        console.log('📤 开始上传图片到后端进行分析，sessionId:', sessionId);
        
        // 使用后端API进行图片上传和分析
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('sessionId', sessionId);
        
        const response = await fetch('http://localhost:3000/api/upload-image', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ 图片上传和分析成功:', data);
        
        // 存储到sessionStorage供story页面使用
        sessionStorage.setItem('uploadedImageName', data.filename);
        sessionStorage.setItem('uploadedImageUrl', `http://localhost:3000${data.url}`);
        sessionStorage.setItem('sessionId', sessionId);
        
        // 如果有分析结果，也存储一份（尽管后端已经加到上下文了）
        if (data.analysis) {
          sessionStorage.setItem('imageAnalysis', JSON.stringify(data.analysis));
          console.log('📸 图片分析结果:', data.analysis);
        }
        
        console.log('📝 图片分析结果已自动添加到会话上下文，sessionId:', sessionId);
        setIsAnalyzing(false);
        
        // 跳转到故事创作页面
        console.log('🎬 跳转到故事创作页面...');
        window.location.href = 'story.html';
        
      } catch (error) {
        console.error('❌ 图片上传失败:', error);
        setIsAnalyzing(false);
        
        // 显示错误信息
        alert('图片上传失败：' + error.message + '\n请检查网络连接和后端服务状态。');
      }
    };

    const goBack = () => {
      window.location.href = 'index.html';
    };

    return (
      <div className="min-h-screen bg-[var(--background-light)]" data-name="upload-app" data-file="upload-app.js">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Back button */}
            <button 
              onClick={goBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)] mb-6 transition-colors"
            >
              <div className="icon-arrow-left text-xl"></div>
              返回首页
            </button>

            {!isAnalyzing ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold gradient-text mb-4">
                    上传你的画作
                  </h1>
                  <p className="text-[var(--text-secondary)] text-lg">
                    选择或拍摄儿童绘画作品，开始创作专属故事
                  </p>
                </div>
                <ImageUpload onImageUpload={handleImageUpload} />
              </>
            ) : (
              <div className="text-center">
                <div className="card">
                  <div className="flex items-center justify-center mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">AI正在分析画作...</h2>
                  <p className="text-[var(--text-secondary)]">请稍等，我们正在理解作品内容</p>
                  
                  {uploadedImage && (
                    <div className="mt-6">
                      <img 
                        src={URL.createObjectURL(uploadedImage)} 
                        alt="上传的画作" 
                        className="max-w-xs mx-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('UploadApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <UploadApp />
  </ErrorBoundary>
);
