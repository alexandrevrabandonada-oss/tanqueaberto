"use client";

import Link from "next/link";
import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || "RootErrorBoundary"}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-10 text-center text-white">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Erro temporario</p>
            <h2 className="text-xl font-bold">Algo saiu do esperado.</h2>
            <p className="max-w-sm text-sm text-white/60">Tente recarregar a tela. Se continuar, volte para o mapa.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white"
            >
              Tentar de novo
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--color-accent)] px-5 text-sm font-semibold text-black"
            >
              Voltar ao mapa
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
