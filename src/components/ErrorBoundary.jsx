import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-6">
            <AlertTriangle size={32} strokeWidth={1.5} className="text-danger" />
          </div>
          <h2 className="text-xl font-semibold text-surface-900 mb-2 tracking-tight">Something went wrong</h2>
          <p className="text-sm text-surface-500 max-w-md mb-8">
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-900 text-white text-sm font-medium hover:bg-surface-800 transition-all duration-200 active:scale-[0.98]"
          >
            <RefreshCcw size={16} />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
