import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Rendered instead of the 3D scene if it throws (context loss, driver bugs). */
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Keeps a WebGL failure local: the scene swaps to its 2.5D fallback instead
 * of unmounting the whole page.
 */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn("3D scene failed, showing fallback:", error, info.componentStack);
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
