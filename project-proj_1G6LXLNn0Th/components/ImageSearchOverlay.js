function ImageSearchOverlay({ images, keyword, isSearching, onClose, isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-[var(--primary-color)] flex items-center gap-3">
            <span className="text-3xl">🎨</span>
            参考图片 {keyword && `- ${keyword}`}
          </h3>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all"
          >
            <div className="icon-x text-xl"></div>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isSearching ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[var(--primary-color)] mx-auto mb-4"></div>
              <p className="text-lg text-[var(--text-secondary)]">正在为你搜索参考图片...</p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">请稍等片刻</p>
            </div>
          ) : images.length > 0 ? (
            <>
              <div className="text-center mb-6">
                <p className="text-lg text-[var(--text-primary)] mb-2">
                  为你找到了 <span className="font-bold text-[var(--primary-color)]">{images.length}</span> 张参考图片
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  点击图片可以查看更多细节，帮助你更好地绘画！
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div 
                    key={image.id || index} 
                    className="group relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      window.open(image.photographer_url || '#', '_blank');
                    }}
                  >
                    <img 
                      src={image.url} 
                      alt={image.alt || `${keyword}参考图片`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-2 left-2 right-2 text-white">
                        <p className="text-xs font-medium truncate">
                          📷 {image.photographer || '摄影师'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center p-4 bg-gradient-to-r from-[var(--accent-color)]/10 to-[var(--secondary-color)]/10 rounded-xl">
                <p className="text-sm text-[var(--text-secondary)]">
                  💡 <strong>绘画小贴士：</strong> 观察这些图片的形状、颜色和细节，然后用你自己的方式画出来！
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg text-[var(--text-primary)] mb-2">没有找到相关图片</p>
              <p className="text-sm text-[var(--text-secondary)]">
                试试用其他词语描述你想画的内容
              </p>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-[var(--text-secondary)]">
              图片来源：Unsplash.com
            </div>
            <button 
              onClick={onClose}
              className="btn-primary px-6 py-2"
            >
              开始绘画
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}