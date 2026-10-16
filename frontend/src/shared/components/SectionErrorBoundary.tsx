import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  sectionName?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in section [${this.props.sectionName || 'unknown'}]:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-2 border border-dashed border-[#FCA5A5] bg-[#FEF2F2] rounded-[4px] text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#DC2626] mb-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Couldn't load this section.</span>
          </div>
          <p className="text-[11px] text-[#7F1D1D] mb-3">
            {this.state.error?.message || 'An error occurred while displaying this section.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2] rounded-[4px] text-xs font-medium cursor-pointer transition-colors shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
