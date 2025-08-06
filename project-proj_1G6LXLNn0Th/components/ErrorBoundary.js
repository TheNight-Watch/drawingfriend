class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        className: "min-h-screen flex items-center justify-center bg-gray-50"
      }, React.createElement('div', {
        className: "text-center"
      }, [
        React.createElement('h1', {
          key: 'title',
          className: "text-2xl font-bold text-gray-900 mb-4"
        }, 'Something went wrong'),
        React.createElement('p', {
          key: 'desc',
          className: "text-gray-600 mb-4"
        }, "We're sorry, but something unexpected happened."),
        React.createElement('button', {
          key: 'reload',
          onClick: () => window.location.reload(),
          className: "btn-primary"
        }, 'Reload Page')
      ]));
    }
    return this.props.children;
  }
}