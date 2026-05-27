export const ACTIVITY_TYPES = {
  biblia: { label: "Bíblia completa", color: "#7c3aed", icon: "Book" },
  joao: { label: "Evangelho de João", color: "#0ea5e9", icon: "BookOpenText" },
  folheto: { label: "Folheto", color: "#10b981", icon: "FileText" },
  visita: { label: "Visita porta a porta", color: "#f59e0b", icon: "DoorOpen" },
  oracao: { label: "Pedido de oração", color: "#ec4899", icon: "HandHeart" },
  conversao: { label: "Conversão", color: "#ef4444", icon: "Heart" },
  medico: {
    label: "Atendimento médico",
    color: "#06b6d4",
    icon: "Stethoscope",
  },
  radio: { label: "Rádio áudio Bíblia", color: "#8b5cf6", icon: "Radio" },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;
export type ConsentLevel = 0 | 1 | 2 | 3;
export type Role = "voluntario" | "lider" | "coord";
