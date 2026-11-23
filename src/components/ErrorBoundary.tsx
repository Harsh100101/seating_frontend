import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="app-loading min-h-screen flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-md bg-white/90 border border-white/80 rounded-[24px] p-7 shadow-2xl text-center space-y-5 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-[18px] bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-950 tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 mt-2 font-mono leading-relaxed">
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center h-10 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-[11px] text-sm font-medium transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                Try Again
              </button>

              <a
                href="/hierarchy"
                className="inline-flex items-center justify-center h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[11px] text-sm font-medium border border-slate-200 transition-colors"
              >
                <Home className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                Hierarchy
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
