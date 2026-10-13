import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Short label for what failed, e.g. "the orbit". */
  label: string;
  tone?: "ink" | "ivory";
}

interface State {
  failed: boolean;
  attempt: number;
}

/**
 * Error boundary for lazy / heavy sections: shows a styled message with a
 * Retry button instead of an empty hole. Retry remounts the children.
 */
export default class RetryBoundary extends Component<Props, State> {
  state: State = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) console.warn(`[${this.props.label}] failed to load:`, error);
  }

  render() {
    if (!this.state.failed) {
      return <div key={this.state.attempt} className="contents">{this.props.children}</div>;
    }
    const ink = this.props.tone !== "ivory";
    return (
      <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className={`font-display text-[0.72rem] font-bold uppercase tracking-[0.22em] ${ink ? "text-[rgba(245,240,232,0.6)]" : "text-[rgba(21,21,21,0.6)]"}`}>
          Couldn&apos;t load {this.props.label}
        </p>
        <button
          type="button"
          onClick={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))}
          className={`min-h-[44px] rounded-full border px-5 font-display text-[0.8rem] font-bold uppercase tracking-[0.16em] ${ink ? "border-[rgba(245,240,232,0.35)] text-[#F5F0E8]" : "border-[rgba(21,21,21,0.3)] text-[#151515]"}`}
        >
          Retry
        </button>
      </div>
    );
  }
}
