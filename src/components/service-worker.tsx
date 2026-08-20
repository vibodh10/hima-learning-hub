"use client";
import { useEffect } from "react";
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The web application remains fully usable when installation is unavailable.
      });
      return;
    }

    // Remove a previously installed production worker during local development.
    // Otherwise a stopped server can silently fall back to the cached home page,
    // which makes working links appear to do nothing.
    void navigator.serviceWorker.getRegistrations().then(registrations =>
      Promise.all(registrations.map(registration => registration.unregister())),
    );
    if ("caches" in window) {
      void caches.keys().then(keys =>
        Promise.all(keys.filter(key => key.startsWith("hima-public-")).map(key => caches.delete(key))),
      );
    }
  }, []);
  return null;
}
