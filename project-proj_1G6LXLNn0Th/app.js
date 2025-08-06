function HomeApp() {
  try {
    const navigateToUpload = () => {
      window.location.href = 'upload.html';
    };



    return (
      <div className="min-h-screen bg-[var(--background-light)]" data-name="home-app" data-file="app.js">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold gradient-text mb-6">
                分享你的画作，创造专属故事
              </h1>
              <p className="text-[var(--text-secondary)] text-xl mb-8 max-w-2xl mx-auto">
                通过AI智能识别儿童绘画作品，引导创作属于自己的故事，激发创意表达与想象力
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button 
                  onClick={navigateToUpload}
                  className="btn-primary text-lg px-8 py-4 flex items-center gap-3"
                >
                  <div className="icon-upload text-2xl"></div>
                  开始创作故事
                </button>
                

              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="card text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center mx-auto mb-4">
                  <div className="icon-camera text-2xl text-white"></div>
                </div>
                <h3 className="text-xl font-bold mb-3">智能图片识别</h3>
                <p className="text-[var(--text-secondary)]">
                  AI自动识别画面内容、物体、颜色和情感，为故事创作提供智能引导
                </p>
              </div>

              <div className="card text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--secondary-color)] to-[var(--accent-color)] flex items-center justify-center mx-auto mb-4">
                  <div className="icon-mic text-2xl text-white"></div>
                </div>
                <h3 className="text-xl font-bold mb-3">语音交互体验</h3>
                <p className="text-[var(--text-secondary)]">
                  实时语音识别和合成，无需手动操作的自然对话体验
                </p>
              </div>

              <div className="card text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--accent-color)] to-[var(--primary-color)] flex items-center justify-center mx-auto mb-4">
                  <div className="icon-book-open text-2xl text-white"></div>
                </div>
                <h3 className="text-xl font-bold mb-3">故事创作引导</h3>
                <p className="text-[var(--text-secondary)]">
                  基于图片内容的智能提问，上下文感知的故事发展引导
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-8">如何使用</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary-color)] text-white flex items-center justify-center text-xl font-bold mb-3">1</div>
                  <h4 className="font-semibold mb-2">上传画作</h4>
                  <p className="text-sm text-[var(--text-secondary)]">拍照或选择儿童绘画作品</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--secondary-color)] text-white flex items-center justify-center text-xl font-bold mb-3">2</div>
                  <h4 className="font-semibold mb-2">AI分析</h4>
                  <p className="text-sm text-[var(--text-secondary)]">智能识别画面内容和元素</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center text-xl font-bold mb-3">3</div>
                  <h4 className="font-semibold mb-2">语音互动</h4>
                  <p className="text-sm text-[var(--text-secondary)]">通过语音回答AI的引导问题</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary-color)] text-white flex items-center justify-center text-xl font-bold mb-3">4</div>
                  <h4 className="font-semibold mb-2">完成故事</h4>
                  <p className="text-sm text-[var(--text-secondary)]">生成完整故事并保存分享</p>
                </div>
              </div>
            </div>
          </div>
        </main>
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
