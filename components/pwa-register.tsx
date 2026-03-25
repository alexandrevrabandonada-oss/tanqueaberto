"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;
    let updateInterval = 0;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
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

        if (registration.waiting) {
          emitUpdateReady();
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
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
        void navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
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
