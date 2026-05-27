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

export default function HomePage() {
  const entries = Object.entries(ACTIVITY_TYPES) as [
    ActivityType,
    (typeof ACTIVITY_TYPES)[ActivityType],
  ][];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {entries.map(([type, config]) => {
        const Icon = ICONS[type];
        return (
          <Link
            key={type}
            href={`/atividade/${type}`}
            className="flex flex-col items-center justify-center min-h-24 aspect-square rounded-xl p-6 gap-2"
            style={{ backgroundColor: config.color }}
          >
            <Icon className="size-8 text-white" />
            <span className="text-sm font-medium text-white text-center leading-tight">
              {config.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
