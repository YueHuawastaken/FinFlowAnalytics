import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">An unexpected error occurred while rendering this page.</p>
              <pre className="mt-3 text-xs whitespace-pre-wrap">{this.state.error && this.state.error.toString()}</pre>
              {this.state.info && <details className="mt-2 text-xs"><summary>More</summary><pre className="whitespace-pre-wrap">{this.state.info.componentStack}</pre></details>}
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
