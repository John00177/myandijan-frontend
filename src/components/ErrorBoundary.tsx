import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time throws so one broken subtree doesn't blank the whole app.
 *
 * The case this actually protects against in production is a stale lazy chunk:
 * routes are code-split with hashed filenames, so a tab left open across a
 * redeploy requests a chunk that no longer exists, the dynamic import rejects
 * mid-render, and — with no boundary — React unmounts the entire tree, leaving
 * a white page with no way back. A reload fetches the new manifest, so
 * "reload" is the correct recovery for that class of failure.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // A failed dynamic import is a deploy-skew problem, not a code bug, and
    // reloading genuinely fixes it — so it gets its own wording instead of
    // the generic "something went wrong".
    const isChunkError = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
      error.message,
    );

    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center text-center px-6 gap-3">
        <h1 className="text-xl font-bold text-ink">
          {isChunkError ? "Sahifa yangilandi" : "Xatolik yuz berdi"}
        </h1>
        <p className="text-sm text-ink-muted max-w-sm">
          {isChunkError
            ? "Ilova yangi versiyaga o'tdi. Sahifani qayta yuklang."
            : "Kutilmagan xatolik. Sahifani qayta yuklab ko'ring."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 h-10 px-5 rounded-btn bg-primary text-white font-medium"
        >
          Qayta yuklash
        </button>
      </div>
    );
  }
}
