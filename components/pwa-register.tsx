"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (!mounted) {
          return;
        }

        const emitUpdateReady = () => {
          window.dispatchEvent(new Event("bomba-aberta-sw-update-ready"));
        };

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

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
