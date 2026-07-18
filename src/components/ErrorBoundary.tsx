import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional name for identifying which boundary caught the error */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary — catches unhandled React errors
 * and displays a recovery UI instead of a white screen.
 * 
 * Logs errors for future Sentry/APM integration.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // ── Future: Send to Sentry/APM ──
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(error, { extra: errorInfo });
    // }

    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`,
      error,
      errorInfo.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] w-full flex items-center justify-center p-6 bg-white">
          <Card className="max-w-md w-full border-red-200 bg-white">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">
                  Etwas ist schiefgelaufen
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ein unerwarteter Fehler ist aufgetreten. Versuche es erneut oder lade die Seite neu.
                </p>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="text-left text-xs bg-slate-50 rounded-lg p-3 max-h-32 overflow-auto">
                  <summary className="cursor-pointer font-medium text-slate-500">
                    Fehlerdetails
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-red-500">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={this.handleReset}>
                  Erneut versuchen
                </Button>
                <Button size="sm" onClick={this.handleReload} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Seite neu laden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
