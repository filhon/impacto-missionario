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

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-8">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2.5">
          <span className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {group.label}
          </span>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {group.types.map((type) => {
              const config = ACTIVITY_TYPES[type];
              const Icon = ICONS[type];
              const rgb = hexToRgb(config.color);
              return (
                <Link
                  key={type}
                  href={`/atividade/${type}`}
                  className="group flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl p-5 transition-all duration-150 active:scale-95"
                  style={{
                    backgroundColor: `rgb(${rgb} / 0.1)`,
                    boxShadow: `inset 0 0 0 1.5px rgb(${rgb} / 0.2)`,
                  }}
                >
                  <Icon
                    className="size-8 transition-transform duration-150 group-active:scale-90"
                    style={{ color: config.color }}
                  />
                  <span
                    className="text-center text-sm font-semibold leading-tight"
                    style={{ color: config.color }}
                  >
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
