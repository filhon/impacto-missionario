"use client";

import { useRef, useState, useCallback } from "react";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";

const LONG_PRESS_MS = 600;

interface ActivityCardProps {
  tipo: ActivityType;
  count: number;
  icon: React.ElementType;
  onTap: () => void;
  onLongPress: (origin: { x: number; y: number }) => void;
  tapOnly?: boolean;
}

export function ActivityCard({
  tipo,
  count,
  icon: Icon,
  onTap,
  onLongPress,
  tapOnly = false,
}: ActivityCardProps) {
  const config = ACTIVITY_TYPES[tipo];
  const [pressing, setPressing] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const firedLongRef = useRef(false);

  const rgb = hexToRgb(config.color);

  const startPress = useCallback(
    (x: number, y: number) => {
      if (tapOnly) return;
      originRef.current = { x, y };
      firedLongRef.current = false;
      setPressing(true);
      timerRef.current = setTimeout(() => {
        firedLongRef.current = true;
        setPressing(false);
        onLongPress(originRef.current);
      }, LONG_PRESS_MS);
    },
    [onLongPress, tapOnly],
  );

  const cancelPress = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
  }, []);

  const endPress = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
    if (!firedLongRef.current) {
      setPopKey((k) => k + 1);
      onTap();
    }
  }, [onTap]);

  return (
    <button
      className="group relative flex flex-col items-center justify-between rounded-2xl p-4 min-h-28 overflow-hidden select-none transition-transform duration-100 active:scale-95"
      style={{
        backgroundColor: `rgb(${rgb} / 0.1)`,
        boxShadow: `inset 0 0 0 1.5px rgb(${rgb} / 0.2)`,
        WebkitTapHighlightColor: "transparent",
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        startPress(e.clientX, e.clientY);
      }}
      onPointerUp={endPress}
      onPointerCancel={cancelPress}
      // Prevent context menu on long press (mobile)
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Press progress ring */}
      {pressing && (
        <span
          key={`ring-${Date.now()}`}
          className="absolute inset-0 rounded-2xl animate-press-ring border-2 pointer-events-none"
          style={{
            borderColor: config.color,
            animationDuration: `${LONG_PRESS_MS}ms`,
          }}
        />
      )}

      {/* Icon */}
      <Icon className="size-7 mt-1 shrink-0" style={{ color: config.color }} />

      {/* Label */}
      <span
        className="text-center text-xs font-semibold leading-tight px-1"
        style={{ color: config.color }}
      >
        {config.label}
      </span>

      {/* Counter badge */}
      <span
        key={popKey}
        className={`tabular-nums text-lg font-bold leading-none ${popKey > 0 ? "animate-count-pop" : ""}`}
        style={{ color: config.color }}
      >
        {count}
      </span>
    </button>
  );
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}
