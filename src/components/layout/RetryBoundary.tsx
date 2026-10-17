import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Short label for what failed, e.g. "the orbit". */
  label: string;
  /** Background the fallback sits on: "ink" (dark) or "ivory" (light). */
  tone?: "ink" | "ivory";
  /** Section anchor id kept on the fallback, so menu links still land. */
  id?: string;
  /** Full-section fallback (min one screen) instead of an inline one. */
  section?: boolean;
}

interface State {
  failed: boolean;
  attempt: number;
  chunk: boolean;
}

/** A lazy chunk that failed to download (stale deploy, flaky network). */
function isChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(msg);
}

/**
 * Error boundary for every section and heavy widget: one part failing never
 * blanks the page. Shows a styled message with Retry; Retry remounts the
 * children, or reloads the page when a code chunk itself failed to download
 * (a remount can't re-fetch a failed lazy import).
 */
export default class RetryBoundary extends Component<Props, State> {
  state: State = { failed: false, attempt: 0, chunk: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { failed: true, chunk: isChunkError(error) };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) console.warn(`[${this.props.label}] failed to load:`, error);
  }

  private retry = () => {
    if (this.state.chunk) {
      window.location.reload();
      return;
    }
    this.setState((s) => ({ failed: false, chunk: false, attempt: s.attempt + 1 }));
  };

  render() {
    if (!this.state.failed) {
      return <div key={this.state.attempt} className="contents">{this.props.children}</div>;
    }
    const ink = this.props.tone !== "ivory";
    const { section, id, label } = this.props;
    return (
      <div
        id={id}
        role="alert"
        className={`relative flex w-full flex-col items-center justify-center gap-4 p-6 text-center ${
          section ? "min-h-[70svh]" : "h-full min-h-[200px]"
        } ${section ? (ink ? "bg-[#151515]" : "bg-[#F5F0E8]") : ""}`}
      >
        <span
          aria-hidden="true"
          className={`h-[2px] w-10 rounded-full ${ink ? "bg-[#E63843]" : "bg-[#E63843]"}`}
        />
        <p
          className={`font-display text-[0.72rem] font-bold uppercase tracking-[0.22em] ${
            ink ? "text-[rgba(245,240,232,0.7)]" : "text-[rgba(21,21,21,0.7)]"
          }`}
        >
          Couldn&apos;t load {label}
        </p>
        <p className={`max-w-xs text-[0.95rem] ${ink ? "text-[rgba(245,240,232,0.6)]" : "text-[rgba(21,21,21,0.62)]"}`}>
          The rest of the page is fine. Give it another go.
        </p>
        <button
          type="button"
          onClick={this.retry}
          className={`min-h-[44px] rounded-full border px-6 font-display text-[0.8rem] font-bold uppercase tracking-[0.16em] transition-colors ${
            ink
              ? "border-[rgba(245,240,232,0.35)] text-[#F5F0E8] hover:border-[#D8FF63] hover:text-[#D8FF63]"
              : "border-[rgba(21,21,21,0.3)] text-[#151515] hover:border-[#E63843] hover:text-[#E63843]"
          }`}
        >
          Retry
        </button>
      </div>
    );
  }
}
