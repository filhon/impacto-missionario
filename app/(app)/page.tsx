import Link from "next/link";
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
  { label: "Material", types: ["biblia", "joao", "folheto"] },
  { label: "Contato", types: ["visita", "oracao", "conversao"] },
  { label: "Serviços", types: ["medico", "radio"] },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 px-4 pt-6 pb-8">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {group.label}
          </span>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {group.types.map((type) => {
              const config = ACTIVITY_TYPES[type];
              const Icon = ICONS[type];
              return (
                <Link
                  key={type}
                  href={`/atividade/${type}`}
                  className="flex flex-col items-center justify-center rounded-2xl p-5 gap-2.5 min-h-25 active:scale-95 transition-transform"
                  style={{ backgroundColor: config.color }}
                >
                  <Icon className="size-8 text-white" />
                  <span className="text-sm font-semibold text-white text-center leading-tight">
                    {config.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
