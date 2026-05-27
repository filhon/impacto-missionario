"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { registerPerson } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CONSENT_TEXTS } from "@/lib/consent/texts";

const NEED_TYPES = [
  { value: "oração", label: "Oração" },
  { value: "financeiro", label: "Financeiro" },
  { value: "saúde", label: "Saúde" },
  { value: "espiritual", label: "Espiritual" },
  { value: "outro", label: "Outro" },
] as const;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function FormN2({
  activityHint,
  neighborhoods,
}: {
  activityHint?: string;
  neighborhoods: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [consentChecked, setConsentChecked] = useState(false);
  const [needType, setNeedType] = useState("");
  const [phone, setPhone] = useState("");
  const [conversionDecision, setConversionDecision] = useState(false);

  const formDisabled = !consentChecked;

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");
    setPhone(formatPhone(digits));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = (formData.get("name") as string)?.trim();
    if (!name || name.length < 2) {
      toast.error("Nome deve ter pelo menos 2 caracteres");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error("Informe um WhatsApp válido com DDD");
      return;
    }

    startTransition(async () => {
      const result = await registerPerson({
        consentLevel: 2,
        activityHint,
        name,
        phone: phoneDigits,
        neighborhood: (formData.get("neighborhood") as string) || undefined,
        city: (formData.get("city") as string) || undefined,
        needType: needType || undefined,
        prayerRequest: (formData.get("prayerRequest") as string) || undefined,
        conversionDecision,
        consentTextShown: CONSENT_TEXTS[2],
      });
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar pessoa — N2</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="rounded-lg border-2 border-primary p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">
              Leia em voz alta pra pessoa:
            </p>
            <p className="text-lg">{CONSENT_TEXTS[2]}</p>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-muted-foreground leading-snug">
                Li a frase em voz alta e a pessoa concordou em participar
              </span>
            </label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              disabled={formDisabled}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              disabled={formDisabled}
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              list="neighborhood-list"
              disabled={formDisabled}
            />
            <datalist id="neighborhood-list">
              {neighborhoods.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" disabled={formDisabled} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="needType">Tipo de necessidade</Label>
            <select
              id="needType"
              name="needType"
              value={needType}
              onChange={(e) => setNeedType(e.target.value)}
              disabled={formDisabled}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {NEED_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prayerRequest">
              Pedido de oração{" "}
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="prayerRequest"
              name="prayerRequest"
              maxLength={500}
              rows={3}
              disabled={formDisabled}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={conversionDecision}
              onCheckedChange={(v) => setConversionDecision(v === true)}
              disabled={formDisabled}
              className="mt-0.5"
            />
            <span className="text-sm leading-snug">Aceitou a Cristo hoje</span>
          </label>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending || !consentChecked}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
