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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-fade-in-up" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 border border-rose-100 shadow-sm">
            <AlertTriangle size={32} strokeWidth={1.5} className="text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-2 tracking-tight">حدث خطأ غير متوقع في الواجهة</h2>
          <p className="text-sm text-surface-500 max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || "تعذر تحميل هذا الجزء من التطبيق، تم تسجيل الخطأ تلقائياً."}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <RefreshCcw size={16} />
              إعادة المحاولة
            </button>
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-100 text-surface-700 text-sm font-medium hover:bg-surface-200 transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
