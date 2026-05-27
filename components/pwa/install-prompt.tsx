"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const DISMISSED_FLAG = "pwa-install-dismissed";
const SHOW_DELAY_MS = 30_000;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [visible, setVisible] = useState(false);

  const hide = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_FLAG, "1");
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (!("BeforeInstallPromptEvent" in window)) return;

    const timer = setTimeout(() => {
      if (sessionStorage.getItem(DISMISSED_FLAG)) return;
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as unknown as { prompt: () => Promise<void> }).prompt();
    const result = await (
      deferredPrompt as unknown as { userChoice: Promise<{ outcome: string }> }
    ).userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
    }
    hide();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-lg md:bottom-8 md:left-auto md:right-8 md:w-96">
      <p className="text-sm font-medium">Instalar Impacto Missionário</p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={install}>
          Instalar
        </Button>
        <button
          type="button"
          onClick={hide}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
