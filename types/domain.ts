export const ACTIVITY_TYPES = {
  biblia: { label: "Bíblia completa", color: "#7c3aed" },
  joao: { label: "Evangelho de João", color: "#0ea5e9" },
  folheto: { label: "Folheto", color: "#10b981" },
  visita: { label: "Visita porta a porta", color: "#f59e0b" },
  oracao: { label: "Pedido de oração", color: "#ec4899" },
  conversao: { label: "Conversão", color: "#ef4444" },
  medico: { label: "Atendimento médico", color: "#06b6d4" },
  radio: { label: "Rádio áudio Bíblia", color: "#8b5cf6" },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;
export type ConsentLevel = 0 | 1 | 2 | 3;
export type Role = "voluntario" | "lider" | "coord";
