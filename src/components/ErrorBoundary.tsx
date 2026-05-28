import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, State> {
  constructor(props: { children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#fff] p-6">
          <div className="max-w-2xl w-full bg-white border border-red-100 rounded-2xl p-8 shadow">
            <h2 className="text-xl font-bold text-red-600 mb-2">An unexpected error occurred</h2>
            <p className="text-sm text-neutral-700 mb-4">The app encountered a runtime error. See console for details.</p>
            <details className="text-xs text-neutral-500 whitespace-pre-wrap bg-gray-50 p-3 rounded">
              {String(this.state.error && this.state.error.stack)}
            </details>
            <div className="mt-4">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-neutral-900 text-amber-50 rounded">Reload</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
