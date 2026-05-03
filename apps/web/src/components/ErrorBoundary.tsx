import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 顶层错误边界。任何子树抛错都会被捕获，避免整个应用白屏。
 * 提供「重新加载」入口，并在控制台保留原始堆栈方便定位。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 控制台保留原始信息，方便排查
    console.error('[ErrorBoundary] caught:', error, info);
  }

  private handleReload = () => {
    // 优先尝试重置状态恢复（轻量重试）；不行再硬刷新
    this.setState({ error: null });
    window.setTimeout(() => {
      if (this.state.error) window.location.reload();
    }, 30);
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-white/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 shadow-2xl p-8 text-center backdrop-blur-md animate-fadeInUp">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-2xl">
            🥲
          </div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">出了点小状况</h1>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 mb-6">
            页面遇到了一个未处理的错误，但你的回忆都还在云端，先试着重新加载一下。
          </p>
          {import.meta.env.DEV && (
            <pre className="text-left text-xs text-rose-500 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-900/20 rounded-xl p-3 mb-5 overflow-auto max-h-40 whitespace-pre-wrap break-words">
              {error.stack || error.message}
            </pre>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-full bg-gradient-to-r from-rose-400 via-purple-400 to-sky-400 text-white px-5 py-2 text-sm font-medium shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
            >
              重新加载
            </button>
            <button
              type="button"
              onClick={this.handleHardReload}
              className="rounded-full border border-slate-200 dark:border-slate-700 px-5 py-2 text-sm text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              强制刷新
            </button>
          </div>
        </div>
      </div>
    );
  }
}
