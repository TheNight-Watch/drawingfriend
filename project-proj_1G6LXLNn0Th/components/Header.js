function Header() {
  try {
    return (
      <header className="bg-white shadow-sm border-b border-gray-100" data-name="header" data-file="components/Header.js">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center">
                <div className="icon-palette text-xl text-white"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">AI故事绘画</h1>
                <p className="text-sm text-[var(--text-secondary)]">让每幅画都有自己的故事</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors">
                如何使用
              </a>
              <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors">
                关于我们
              </a>
            </nav>
          </div>
        </div>
      </header>
    );
  } catch (error) {
    console.error('Header component error:', error);
    return null;
  }
}