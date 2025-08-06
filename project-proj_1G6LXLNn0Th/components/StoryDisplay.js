function StoryDisplay({ storyContent, userInput }) {
  try {
    return (
      <div className="card" data-name="story-display" data-file="components/StoryDisplay.js">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-book-open text-2xl text-[var(--primary-color)]"></div>
          <h3 className="text-xl font-bold">你的故事</h3>
        </div>
        
        {storyContent ? (
          <div className="space-y-4">
            <div className="bg-[var(--background-light)] rounded-lg p-4 min-h-[200px]">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {storyContent}
                </p>
              </div>
            </div>
            
            {userInput && (
              <div className="border-l-4 border-[var(--accent-color)] pl-4">
                <p className="text-sm text-[var(--text-secondary)] mb-1">最新添加：</p>
                <p className="text-[var(--text-primary)]">{userInput}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>故事字数：{storyContent.length} 字</span>
              <div className="flex items-center gap-2">
                <div className="icon-heart text-lg text-red-400"></div>
                <span>创作中...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="icon-edit text-4xl text-gray-300 mb-4"></div>
            <p className="text-[var(--text-secondary)]">
              开始录音，你的故事将在这里显示
            </p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('StoryDisplay component error:', error);
    return null;
  }
}