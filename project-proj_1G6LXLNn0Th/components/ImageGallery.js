function ImageGallery({ images, onImageSelect, onClose }) {
  try {
    if (!images || images.length === 0) {
      return null;
    }

    return (
      <div className="sketch-card mb-6" data-name="image-gallery" data-file="components/ImageGallery.js">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="sketch-icon" style={{fontSize: '24px', color: 'var(--sketch-orange)'}}>🎨</div>
            <h3 className="hand-drawn-title text-lg">绘画参考图片</h3>
          </div>
          <button 
            onClick={onClose}
            className="sketch-control-btn text-sm"
            style={{width: '32px', height: '32px', fontSize: '16px'}}
          >
            ✕
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {images.map(image => (
            <div 
              key={image.id} 
              className="relative cursor-pointer group"
              onClick={() => onImageSelect(image)}
              style={{
                border: '2px solid var(--sketch-blue)',
                borderRadius: '15px 12px 18px 14px',
                overflow: 'hidden',
                transform: 'rotate(-0.5deg)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(0.5deg) scale(1.05)';
                e.currentTarget.style.borderColor = 'var(--sketch-pink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(-0.5deg) scale(1)';
                e.currentTarget.style.borderColor = 'var(--sketch-blue)';
              }}
            >
              <img 
                src={image.thumbnail || image.url} 
                alt={image.description}
                className="w-full h-32 object-cover"
                loading="lazy"
                style={{
                  filter: 'sepia(10%) saturate(110%) brightness(105%)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <div style={{
                  color: 'var(--sketch-yellow)', 
                  fontSize: '20px',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}>👁️</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="hand-drawn-text text-white text-xs truncate">
                  {image.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <p className="hand-drawn-subtitle text-sm">
            点击图片查看大图，这些图片可以帮助你画出更好的作品！ 🎨
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('ImageGallery component error:', error);
    return null;
  }
}