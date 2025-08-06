function HomeApp() {
  try {
    const [isWelcomeMode, setIsWelcomeMode] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = React.useState(false);

    const startWelcomeFlow = async () => {
      setIsWelcomeMode(true);
      setIsSpeaking(true);
      
      try {
        // Use speech synthesis if available
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance("你来了！太好了，我们一起来创作属于你的故事吧！先画一幅你喜欢的画，然后告诉我画里的故事。");
          utterance.lang = 'zh-CN';
          utterance.rate = 0.9;
          utterance.onend = () => {
            setIsSpeaking(false);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          // Fallback if speech synthesis not available
          setTimeout(() => {
            setIsSpeaking(false);
          }, 3000);
        }
      } catch (error) {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
      }
    };

    const navigateToUpload = () => {
      window.location.href = 'upload.html';
    };

    const resetWelcome = () => {
      setIsWelcomeMode(false);
      setIsSpeaking(false);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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
                  {isWelcomeMode ? "让我们开始创作你的专属故事吧！" : "你好！我是你的故事创作伙伴"}
                </p>
              </div>
            </div>

            {/* Default Action Buttons (when not in welcome mode) */}
            {!isWelcomeMode && (
              <div className="text-center space-y-6">
                {/* Start Flow Button */}
                <button 
                  onClick={startWelcomeFlow}
                  className="btn-primary text-2xl px-12 py-6 flex items-center gap-4 mx-auto mb-6"
                >
                  <div className="icon-heart text-3xl"></div>
                  开始创作故事
                </button>
                
                {/* Upload Button */}
                <button 
                  onClick={navigateToUpload}
                  className="btn-secondary text-lg px-8 py-4 flex items-center gap-3 mx-auto"
                >
                  <div className="icon-upload text-2xl"></div>
                  直接上传画作
                </button>
              </div>
            )}


          </div>
        </main>

        {/* Fixed Speech Bubble at Bottom */}
        {isWelcomeMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
            <div className="container mx-auto max-w-4xl">
              <div className="bg-gradient-to-r from-[var(--accent-color)]/20 to-[var(--secondary-color)]/20 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  {/* Small Avatar */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isSpeaking ? 'animate-pulse' : ''}`}>
                    <div className="icon-smile text-2xl text-white"></div>
                  </div>
                  
                  {/* Speech Content */}
                  <div className="flex-1">
                    <div className="text-[var(--text-primary)] mb-3">
                      {isSpeaking ? "你来了！太好了，我们一起来创作属于你的故事吧！" : "准备好开始了吗？"}
                    </div>
                    
                    {isSpeaking && (
                      <div className="flex items-center gap-2 text-sm text-[var(--secondary-color)]">
                        <div className="icon-volume-2 text-lg animate-pulse"></div>
                        <span>正在播放...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button 
                      onClick={navigateToUpload}
                      className={`btn-primary flex items-center gap-2 ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isSpeaking}
                    >
                      <div className="icon-camera text-xl"></div>
                      {isSpeaking ? "听我说完..." : "上传画作"}
                    </button>
                    
                    <button 
                      onClick={resetWelcome}
                      className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors px-3"
                    >
                      <div className="icon-x text-xl"></div>
                    </button>
                  </div>
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