function ImageUpload({ onImageUpload }) {
  try {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef(null);

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => file.type.startsWith('image/'));
      
      if (imageFile) {
        onImageUpload(imageFile);
      }
    };

    const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        onImageUpload(file);
      }
    };

    const handleCameraCapture = () => {
      fileInputRef.current.click();
    };

    return (
      <div className="card" data-name="image-upload" data-file="components/ImageUpload.js">
        <div
          className={`upload-zone ${isDragging ? 'border-[var(--secondary-color)] bg-[var(--background-card)]' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="icon-camera text-6xl text-[var(--primary-color)] mb-4"></div>
          <h3 className="text-xl font-bold mb-2">上传绘画作品</h3>
          <p className="text-[var(--text-secondary)] mb-6">
            拖拽图片到此处，或点击下方按钮选择文件
          </p>
          
          <div className="flex justify-center">
            <button
              onClick={() => fileInputRef.current.click()}
              className="btn-primary flex items-center gap-2"
            >
              <div className="icon-camera text-xl"></div>
              上传画作
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            支持 JPG、PNG、JPEG 格式，建议图片大小不超过 10MB
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('ImageUpload component error:', error);
    return null;
  }
}