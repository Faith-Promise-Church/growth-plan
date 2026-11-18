import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="empty-state">
            <h1 className="empty-state__title">Something went wrong</h1>
            <p>Reload the page to try again. Your saved plan is safe.</p>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              <span>Reload</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
