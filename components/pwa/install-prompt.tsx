"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, Plus } from "lucide-react";

const DISMISSED_FLAG = "pwa-install-dismissed";
const SHOW_DELAY_MS = 30_000;

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window.navigator as unknown as { standalone?: boolean }).standalone
  );
}

function isAndroid() {
  return "BeforeInstallPromptEvent" in window;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [mode, setMode] = useState<"android" | "ios" | null>(null);

  const hide = useCallback(() => {
    setMode(null);
    sessionStorage.setItem(DISMISSED_FLAG, "1");
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_FLAG)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      if (sessionStorage.getItem(DISMISSED_FLAG)) return;
      if (isAndroid()) {
        setMode("android");
      } else if (isIOS()) {
        setMode("ios");
      }
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
    if (result.outcome === "accepted") setDeferredPrompt(null);
    hide();
  };

  if (!mode) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border border-border bg-card p-4 shadow-lg md:bottom-8 md:left-auto md:right-8 md:w-96">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug">
          {mode === "ios"
            ? "Instale o app na sua tela de início"
            : "Instalar Impacto Missionário"}
        </p>
        <button
          type="button"
          onClick={hide}
          aria-label="Fechar"
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {mode === "ios" ? (
        <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
              1
            </span>
            Toque em{" "}
            <Share size={14} className="inline shrink-0 text-primary" />{" "}
            <span className="font-medium text-foreground">Compartilhar</span> no
            Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
              2
            </span>
            Selecione{" "}
            <Plus size={14} className="inline shrink-0 text-primary" />{" "}
            <span className="font-medium text-foreground">
              Adicionar à Tela de Início
            </span>
          </li>
        </ol>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={install}>
            Instalar
          </Button>
        </div>
      )}
    </div>
  );
}
