"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/context/session";
import { useInsertActivityEvents } from "@/lib/hooks/use-insert-activity-events";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";

interface CounterScreenProps {
  tipo: ActivityType;
}

export function CounterScreen({ tipo }: CounterScreenProps) {
  const [count, setCount] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const router = useRouter();
  const { user, team, event } = useSession();
  const mutation = useInsertActivityEvents();
  const activity = ACTIVITY_TYPES[tipo];

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
      },
      () => {},
      { timeout: 5000, enableHighAccuracy: false },
    );
  }, []);

  function handleIncrement(n: number) {
    const teamId = team?.id;
    if (!teamId) {
      toast.error("Erro ao salvar — equipa não encontrada");
      return;
    }

    mutation.mutate(
      {
        activityType: tipo,
        count: n,
        lat,
        lng,
        userId: user.id,
        teamId,
        eventId: event.id,
      },
      {
        onSuccess: () => {
          setCount((prev) => prev + n);
        },
        onError: () => {
          toast.error("Erro ao salvar — tentando novamente");
        },
      },
    );
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100dvh-8rem)] px-4 py-8">
      <div className="flex items-center gap-3 w-full">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <div
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: activity.color }}
        />
        <span className="text-lg font-semibold">{activity.label}</span>
      </div>

      <div className="flex items-center justify-center">
        <span className="text-8xl font-bold tabular-nums">{count}</span>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={() => handleIncrement(1)}
          disabled={mutation.isPending}
          className="w-full h-20 text-2xl font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          +1
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => handleIncrement(5)}
            disabled={mutation.isPending}
            className="flex-1 h-16 text-xl font-semibold rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +5
          </button>
          <button
            onClick={() => handleIncrement(10)}
            disabled={mutation.isPending}
            className="flex-1 h-16 text-xl font-semibold rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +10
          </button>
        </div>
        <button
          onClick={() => router.push(`/pessoa/novo?activity=${tipo}`)}
          className="w-full h-12 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
        >
          Vincular a pessoa
        </button>
      </div>
    </div>
  );
}
