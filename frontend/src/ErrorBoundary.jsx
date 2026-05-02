import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Error boundary to catch and display React render errors gracefully
 * Prevents entire app from crashing on component errors
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Updates state when a child component throws an error
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state with hasError flag
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Logs error details for debugging
   * @param {Error} error
   * @param {Object} info - Component stack trace
   */
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: '20px', textAlign: 'center', color: '#ff8888' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or call 1950 for help.</p>
          <button onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: '10px', padding: '8px 20px', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
