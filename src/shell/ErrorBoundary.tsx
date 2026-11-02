import { Component, type ReactNode } from 'react';

interface Props { title: string; body: string; reloadLabel: string; children: ReactNode }
interface State { error: Error | null; attempt: number }

/** Wraps every window so one crashing app never takes down the desktop. Users never see stack traces. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };
  static getDerivedStateFromError(error: Error): Partial<State> { return { error }; }
  componentDidCatch(error: Error) { console.error('[window crashed]', error); }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: 'var(--sp-6)', display: 'grid', gap: 'var(--sp-3)', justifyItems: 'start' }}>
          <strong style={{ color: 'var(--danger)' }}>{this.props.title}</strong>
          <span style={{ color: 'var(--text-dim)' }}>{this.props.body}</span>
          <button className="sg-btn" onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}>{this.props.reloadLabel}</button>
        </div>
      );
    }
    return <div key={this.state.attempt} style={{ height: '100%' }}>{this.props.children}</div>;
  }
}
