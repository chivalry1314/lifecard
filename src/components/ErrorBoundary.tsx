import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-amber-800/30 text-amber-100 p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">页面出错了</h2>
            <p className="text-amber-200/60 mb-4">
              {this.state.error?.message || "发生了意外错误"}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={this.handleRetry}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                刷新重试
              </Button>
              <Button
                variant="outline"
                onClick={this.handleHome}
                className="border-amber-600 text-amber-400 hover:bg-amber-900/30"
              >
                <Home className="w-4 h-4 mr-1" />
                返回首页
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
