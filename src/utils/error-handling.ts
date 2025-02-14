// Save as: src/utils/error-handling.ts

import { Component, ErrorInfo, ReactNode } from 'react';

// Custom error types
export class StreamError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'StreamError';
  }
}

export class BlockchainError extends Error {
  constructor(
    message: string,
    public readonly txHash?: string,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'BlockchainError';
  }
}

// Retry mechanism
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffFactor?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;
  let delay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }

  throw lastError!;
}

// Error reporting
export class ErrorReporter {
  private static instance: ErrorReporter;
  private errors: Array<{
    error: Error;
    timestamp: number;
    context?: Record<string, any>;
  }> = [];

  private constructor() {}

  static getInstance(): ErrorReporter {
    if (!this.instance) {
      this.instance = new ErrorReporter();
    }
    return this.instance;
  }

  reportError(error: Error, context?: Record<string, any>) {
    this.errors.push({
      error,
      timestamp: Date.now(),
      context,
    });

    console.error('Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  getRecentErrors(minutes: number = 5) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.errors.filter(e => e.timestamp >= cutoff);
  }
}

// React Error Boundary Component
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class StreamErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ErrorReporter.getInstance().reportError(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-700">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p>Please try refreshing the page</p>
        </div>
      );
    }

    return this.props.children;
  }
}
