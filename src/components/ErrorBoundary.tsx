import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled app error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. Your saved workouts are safe. Reload to
          continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Reload App
        </button>
      </div>
    );
  }
}
