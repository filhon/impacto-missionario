"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Book,
  BookOpenText,
  FileText,
  DoorOpen,
  HandHeart,
  Heart,
  Stethoscope,
  Radio,
} from "lucide-react";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";
import { ActivityCard } from "@/components/activity-card";
import { LongPressOverlay } from "@/components/long-press-overlay";
import { saveActivityEventLocal } from "@/lib/dexie/repos";
import { db } from "@/lib/dexie/db";
import { undoActivityEvent } from "@/app/(app)/actions";
import { uuidv7 } from "@/lib/uuid/v7";
import { useSession } from "@/lib/context/session";
import { useGps } from "@/lib/hooks/use-gps";
import { useDailyCounts } from "@/lib/hooks/use-daily-counts";

const ICONS: Record<ActivityType, React.ElementType> = {
  biblia: Book,
  joao: BookOpenText,
  folheto: FileText,
  visita: DoorOpen,
  oracao: HandHeart,
  conversao: Heart,
  medico: Stethoscope,
  radio: Radio,
};

const GROUPS: { label: string; types: ActivityType[] }[] = [
  { label: "Material", types: ["biblia", "joao", "folheto", "radio"] },
  { label: "Contato", types: ["visita", "oracao", "conversao"] },
  { label: "Serviços", types: ["medico"] },
];

type OverlayState = {
  tipo: ActivityType;
  origin: { x: number; y: number };
} | null;

export function HomeGrid() {
  const { team } = useSession();
  const router = useRouter();
  const { lat, lng } = useGps();

  const counts = useDailyCounts();
  const [overlay, setOverlay] = useState<OverlayState>(null);

  const handleTap = useCallback(
    async (tipo: ActivityType) => {
      if (tipo === "radio") {
        router.push(`/pessoa/novo?activity=${tipo}`);
        return;
      }
      if (!team?.id) {
        toast.error("Equipe não encontrada");
        return;
      }
      try {
        await saveActivityEventLocal({
          client_event_id: uuidv7(),
          activity_type: tipo,
          count: 1,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          occurred_at: new Date().toISOString(),
        });
      } catch {
        toast.error("Erro ao salvar — tentando novamente");
      }
    },
    [team, lat, lng, router],
  );

  const handleLongPress = useCallback(
    (tipo: ActivityType, origin: { x: number; y: number }) => {
      if (tipo === "radio") {
        router.push(`/pessoa/novo?activity=${tipo}`);
        return;
      }
      setOverlay({ tipo, origin });
    },
    [router],
  );

  const handleUndo = useCallback(async () => {
    if (!overlay) return;
    const { tipo } = overlay;
    setOverlay(null);

    if (counts[tipo] <= 0) {
      toast("Nenhuma atividade para desfazer");
      return;
    }

    try {
      // Busca o último registro do tipo, independente do status de sync
      const last = await db.activity_events
        .orderBy("created_at")
        .filter((e) => e.activity_type === tipo)
        .last();

      if (!last) {
        toast("Não há registro recente para desfazer");
        return;
      }

      // Se já foi sincronizado, precisa desfazer no Supabase também
      if (last.status === "synced") {
        const result = await undoActivityEvent(last.client_event_id);
        if (result.error) {
          toast.error("Erro ao desfazer no servidor");
          return;
        }
      }

      await db.activity_events.delete(last.client_event_id);
      toast.success("Atividade desfeita");
    } catch {
      toast.error("Erro ao desfazer");
    }
  }, [overlay, counts]);

  const handleRegister = useCallback(() => {
    if (!overlay) return;
    const tipo = overlay.tipo;
    setOverlay(null);
    router.push(`/pessoa/novo?activity=${tipo}`);
  }, [overlay, router]);

  return (
    <>
      <div className="flex flex-col gap-6 px-4 pt-5 pb-8">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2.5">
            <span className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </span>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
              {group.types.map((tipo) => (
                <ActivityCard
                  key={tipo}
                  tipo={tipo}
                  count={counts[tipo]}
                  icon={ICONS[tipo]}
                  onTap={() => handleTap(tipo)}
                  onLongPress={(origin) => handleLongPress(tipo, origin)}
                  tapOnly={tipo === "radio"}
                />
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-xs text-muted-foreground px-4 mt-2">
          Toque para registrar · Segure para mais opções
        </p>
      </div>

      {overlay && (
        <LongPressOverlay
          origin={overlay.origin}
          activityLabel={ACTIVITY_TYPES[overlay.tipo].label}
          activityColor={ACTIVITY_TYPES[overlay.tipo].color}
          onUndo={handleUndo}
          onRegister={handleRegister}
          onClose={() => setOverlay(null)}
        />
      )}
    </>
  );
}
