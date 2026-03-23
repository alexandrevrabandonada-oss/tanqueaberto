"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RotateCcw, WifiOff, WifiHigh, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNetworkSimulationLabel, normalizeNetworkSimulationMode, type NetworkSimulationMode, NETWORK_SIM_COOKIE } from "@/lib/dev/network-sim";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface ConnectionInfo {
  online: boolean;
  poor: boolean;
  label: string;
}

function readCookieValue(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const part = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function setCookieValue(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function clearCookieValue(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function getConnectionInfo(): ConnectionInfo {
  if (typeof navigator === "undefined") {
    return { online: true, poor: false, label: "" };
  }

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean; downlink?: number } }).connection;
  const poor = Boolean(connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g" || (typeof connection?.downlink === "number" && connection.downlink < 1.5));
  return { online: navigator.onLine, poor, label: connection?.effectiveType ?? "" };
}

export function PwaStatusStrip() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [connection, setConnection] = useState<ConnectionInfo>(() => getConnectionInfo());
  const [simulationMode, setSimulationMode] = useState<NetworkSimulationMode>("normal");

  const simulationLabel = useMemo(() => getNetworkSimulationLabel(simulationMode), [simulationMode]);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(Boolean(standalone));

    const refreshConnection = () => setConnection(getConnectionInfo());
    const refreshSimulation = () => setSimulationMode(normalizeNetworkSimulationMode(readCookieValue(NETWORK_SIM_COOKIE)));

    refreshConnection();
    refreshSimulation();

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const onUpdateReady = () => setUpdateReady(true);

    const onOnline = () => refreshConnection();
    const onOffline = () => refreshConnection();

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("bomba-aberta-sw-update-ready", onUpdateReady as EventListener);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", refreshSimulation);

    const connectionApi = (navigator as Navigator & { connection?: EventTarget }).connection;
    connectionApi?.addEventListener?.("change", refreshConnection as EventListener);

    navigator.serviceWorker?.getRegistration().then((registration) => {
      if (!registration) {
        return;
      }

      if (registration.waiting) {
        setUpdateReady(true);
      }

      registration.addEventListener?.("updatefound", () => {
        const worker = registration.installing;
        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("bomba-aberta-sw-update-ready", onUpdateReady as EventListener);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", refreshSimulation);
      connectionApi?.removeEventListener?.("change", refreshConnection as EventListener);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  async function reloadWithUpdate() {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      setUpdateReady(false);
      await registration?.update?.();
    }
  }

  const showOffline = !connection.online || simulationMode === "offline";
  const showPoorConnection = !showOffline && (connection.poor || simulationMode === "slow" || simulationMode === "timeout");
  const showInstall = !isInstalled && Boolean(installPrompt);
  const devMode = process.env.NODE_ENV !== "production";

  const updateBanner = updateReady ? (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white/82 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-[color:var(--color-accent)]" />
        <span>Atualização pronta. Recarregue para usar a versão nova.</span>
      </div>
      <Button type="button" variant="secondary" className="h-9 px-3 py-2 text-xs" onClick={() => void reloadWithUpdate()}>
        Recarregar
      </Button>
    </div>
  ) : null;

  const networkBanner = showOffline ? (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-white/84 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-[color:var(--color-danger)]" />
        <span>{simulationMode === "offline" ? "Modo offline de teste ativo. O envio vai falhar até a rede voltar." : "Sem conexão agora. O app segue aberto, mas o envio precisa de internet."}</span>
      </div>
    </div>
  ) : showPoorConnection ? (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/78 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <WifiHigh className="h-4 w-4 text-[color:var(--color-accent)]" />
        <span>{simulationMode === "slow" || simulationMode === "timeout" ? `Simulação de ${simulationLabel}. O envio pode demorar.` : "Conexão fraca. Pode demorar para carregar ou enviar a foto."}</span>
      </div>
      <Badge variant="outline">{connection.label || simulationLabel}</Badge>
    </div>
  ) : null;

  const installBanner = showInstall ? (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/78 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-[color:var(--color-accent)]" />
        <span>Instale o app para abrir mais rápido e voltar com um toque.</span>
      </div>
      <Button type="button" variant="secondary" className="h-9 px-3 py-2 text-xs" onClick={() => void installApp()}>
        Instalar
      </Button>
    </div>
  ) : null;

  const devBanner = devMode ? (
    <div className="rounded-[18px] border border-dashed border-white/10 bg-white/5 p-3 text-xs text-white/70 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[color:var(--color-accent)]" />
          <span>Laboratório de rede</span>
        </div>
        <Badge variant="outline">{simulationLabel}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["normal", "slow", "timeout", "upload_fail", "offline"] as NetworkSimulationMode[]).map((mode) => (
          <Button
            key={mode}
            type="button"
            variant={simulationMode === mode ? "primary" : "secondary"}
            className="h-9 px-3 py-2 text-xs"
            onClick={() => {
              if (mode === "normal") {
                clearCookieValue(NETWORK_SIM_COOKIE);
              } else {
                setCookieValue(NETWORK_SIM_COOKIE, mode);
              }
              setSimulationMode(mode);
              window.location.reload();
            }}
          >
            {getNetworkSimulationLabel(mode)}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/48">Use só em desenvolvimento para testar reconexão, timeout e falha de upload.</p>
    </div>
  ) : null;

  if (!networkBanner && !updateBanner && !installBanner && !devBanner) {
    return null;
  }

  return (
    <div className="relative z-10 mb-4 space-y-2">
      {networkBanner}
      {updateBanner}
      {installBanner}
      {devBanner}
    </div>
  );
}
