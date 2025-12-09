import { Component } from 'react';
import Button from './Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'linear-gradient(180deg, #409083 0%, #283d49 100%)',
          color: '#F4F2EE',
          textAlign: 'center',
          fontFamily: '"neue-haas-grotesk-display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            marginBottom: '16px' 
          }}>
            Something went wrong
          </h1>
          <p style={{ 
            fontSize: '16px', 
            marginBottom: '32px',
            opacity: 0.8,
            maxWidth: '300px'
          }}>
            We encountered an unexpected error. Please try again.
          </p>
          <Button 
            variant="primary-on-color"
            onClick={this.handleReset}
          >
            Return to Login
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
