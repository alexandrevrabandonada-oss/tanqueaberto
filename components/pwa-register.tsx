"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;
    let updateInterval = 0;

    const activateWaitingWorker = async (registration?: ServiceWorkerRegistration | null) => {
      if (!registration?.waiting) {
        return false;
      }

      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return true;
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        if (!mounted) {
          return;
        }

        const emitUpdateReady = () => {
          window.dispatchEvent(new Event("bomba-aberta-sw-update-ready"));
        };

        void registration.update();
        updateInterval = window.setInterval(() => {
          void registration.update();
        }, 60_000);

        if (await activateWaitingWorker(registration)) {
          emitUpdateReady();
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              void activateWaitingWorker(registration);
              emitUpdateReady();
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });

    const onControllerChange = () => {
      window.location.reload();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void navigator.serviceWorker.getRegistration().then(async (registration) => {
          await registration?.update();
          await activateWaitingWorker(registration);
        });
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted = false;
      if (updateInterval) {
        window.clearInterval(updateInterval);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
