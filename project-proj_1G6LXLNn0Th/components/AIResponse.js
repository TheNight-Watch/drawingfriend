function AIResponse({ questions, isProcessing }) {
  try {
    const currentQuestion = questions[questions.length - 1];

    return (
      <div className="card" data-name="ai-response" data-file="components/AIResponse.js">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--secondary-color)] to-[var(--accent-color)] flex items-center justify-center flex-shrink-0">
            <div className="icon-bot text-xl text-white"></div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              AI助手
            </h3>
            
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--secondary-color)]"></div>
                <span className="text-[var(--text-secondary)]">正在思考...</span>
              </div>
            ) : currentQuestion ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-[var(--secondary-color)]/10 to-[var(--accent-color)]/10 rounded-lg p-4">
                  <p className="text-[var(--text-primary)]">{currentQuestion}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <div className="icon-volume-2 text-lg"></div>
                  <span>点击下方按钮回答问题</span>
                </div>
              </div>
            ) : (
              <p className="text-[var(--text-secondary)]">
                等待图片分析完成...
              </p>
            )}
          </div>
        </div>
        
        {questions.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
              历史问题：
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {questions.slice(0, -1).map((question, index) => (
                <div key={index} className="text-sm text-[var(--text-secondary)] bg-gray-50 rounded p-2">
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('AIResponse component error:', error);
    return null;
  }
}