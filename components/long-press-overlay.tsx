"use client";

import { useEffect, useRef } from "react";
import { Undo2, UserPlus } from "lucide-react";

interface LongPressOverlayProps {
  origin: { x: number; y: number };
  onUndo: () => void;
  onRegister: () => void;
  onClose: () => void;
  activityLabel: string;
  activityColor: string;
}

export function LongPressOverlay({
  origin,
  onUndo,
  onRegister,
  onClose,
  activityLabel,
  activityColor,
}: LongPressOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The ripple starts from origin as a percentage of viewport
  const originX = (origin.x / window.innerWidth) * 100;
  const originY = (origin.y / window.innerHeight) * 100;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ transformOrigin: `${originX}% ${originY}%` }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Ripple backdrop */}
      <div
        className="absolute inset-0 animate-ripple-expand"
        style={
          {
            backgroundColor: activityColor,
            "--ripple-x": `${originX}%`,
            "--ripple-y": `${originY}%`,
          } as React.CSSProperties
        }
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-xs animate-fade-in-up">
        <p className="text-white/80 text-sm font-medium tracking-wide uppercase">
          {activityLabel}
        </p>

        {/* Desfazer */}
        <button
          onClick={onUndo}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/20 border border-white/30 px-6 py-5 text-white text-lg font-bold backdrop-blur-sm active:scale-95 transition-transform"
        >
          <Undo2 className="size-6" />
          Desfazer
        </button>

        {/* Registrar */}
        <button
          onClick={onRegister}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-5 text-lg font-bold active:scale-95 transition-transform"
          style={{ color: activityColor }}
        >
          <UserPlus className="size-6" />
          Registrar pessoa
        </button>

        <button
          onClick={onClose}
          className="text-white/60 text-sm mt-2 active:text-white/90"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
