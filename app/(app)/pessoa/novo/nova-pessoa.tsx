"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { FormN0 } from "./form-n0";
import { FormN1 } from "./form-n1";
import { FormN2 } from "./form-n2";
import { FormN3 } from "./form-n3";

interface NovaPessoaProps {
  initialConsentLevel: number | null;
  activityHint?: string;
  neighborhoods: string[];
}

const LEVELS = [
  { level: 0, title: "Não, só contar", desc: "Só uma contagem, sem dados" },
  {
    level: 1,
    title: "Sim, sem identificar",
    desc: "Bairro e tipo de necessidade",
  },
  {
    level: 2,
    title: "Sim, com nome e contato",
    desc: "Nome + WhatsApp + consentimento verbal",
  },
  {
    level: 3,
    title: "Sim, cadastro completo",
    desc: "Tudo + endereço, foto e assinatura",
  },
];

export function NovaPessoa({
  initialConsentLevel,
  activityHint,
  neighborhoods,
}: NovaPessoaProps) {
  const [step, setStep] = useState<"seletor" | "form">(
    initialConsentLevel !== null ? "form" : "seletor",
  );
  const [consentLevel, setConsentLevel] = useState<number | null>(
    initialConsentLevel,
  );

  function handleSelectLevel(level: number) {
    setConsentLevel(level);
    setStep("form");
  }

  if (step === "seletor") {
    return (
      <div className="space-y-3 p-4">
        <h1 className="text-lg font-semibold">Nível de registro</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o nível de dados que deseja registrar:
        </p>
        <div className="space-y-2">
          {LEVELS.map(({ level, title, desc }) => (
            <button
              key={level}
              type="button"
              onClick={() => handleSelectLevel(level)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left ring-1 ring-foreground/10 transition-colors hover:bg-accent"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                N{level}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{title}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {consentLevel === 0 && <FormN0 activityHint={activityHint} />}
      {consentLevel === 1 && (
        <FormN1 activityHint={activityHint} neighborhoods={neighborhoods} />
      )}
      {consentLevel === 2 && (
        <FormN2 activityHint={activityHint} neighborhoods={neighborhoods} />
      )}
      {consentLevel === 3 && (
        <FormN3 activityHint={activityHint} neighborhoods={neighborhoods} />
      )}
    </div>
  );
}
