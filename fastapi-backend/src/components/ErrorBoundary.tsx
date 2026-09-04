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
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[var(--bg-deep)] text-[var(--text-primary)]">
          <div className="max-w-2xl w-full bg-[var(--bg-card)] border border-red-500/30 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">An unexpected error occurred</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">The app encountered a runtime error. See console for details.</p>
            <details className="text-xs whitespace-pre-wrap bg-black/20 p-3 rounded border border-white/10">
              {String(this.state.error && this.state.error.stack)}
            </details>
            <div className="mt-4">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
