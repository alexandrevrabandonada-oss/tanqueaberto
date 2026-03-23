"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || "ErrorBoundary"}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-[color:var(--color-danger)]/10 p-4">
            <AlertCircle className="h-10 w-10 text-[color:var(--color-danger)]" />
          </div>
          <h2 className="text-xl font-bold text-white">Algo deu errado aqui</h2>
          <p className="mt-2 max-w-xs text-sm text-white/54">
            Tivemos um problema inesperado nesta parte da tela. Tente recarregar ou volte para a home.
          </p>
          {this.state.error?.message && (
             <p className="mt-4 rounded-lg bg-black/30 px-3 py-2 text-[10px] font-mono text-white/40">
               Error: {this.state.error.message}
             </p>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={this.handleReset} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Tentar de novo
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = "/"} className="gap-2">
              <Home className="h-4 w-4" />
              Voltar Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
