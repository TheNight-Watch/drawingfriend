function ImageModal({ image, onClose }) {
  try {
    if (!image) return null;

    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
        data-name="image-modal" 
        data-file="components/ImageModal.js"
      >
        <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-bold">{image.description}</h3>
            <button 
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
            >
              <div className="icon-x text-xl"></div>
            </button>
          </div>
          
          <div className="p-4">
            <img 
              src={image.url} 
              alt={image.description}
              className="w-full h-auto max-h-96 object-contain rounded-lg"
            />
            
            <div className="mt-4 text-sm text-[var(--text-secondary)]">
              <p>作者: {image.author}</p>
              <p className="mt-2">这张图片可以作为你绘画的参考，观察其中的形状、颜色和细节！</p>
            </div>
          </div>
          
          <div className="p-4 border-t flex justify-center">
            <button 
              onClick={onClose}
              className="btn-primary"
            >
              继续创作故事
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('ImageModal component error:', error);
    return null;
  }
}