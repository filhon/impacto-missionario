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

const NEED_TYPES = [
  { value: "oração", label: "Oração" },
  { value: "financeiro", label: "Financeiro" },
  { value: "saúde", label: "Saúde" },
  { value: "espiritual", label: "Espiritual" },
  { value: "outro", label: "Outro" },
] as const;

export function FormN1({
  activityHint,
  neighborhoods,
}: {
  activityHint?: string;
  neighborhoods: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [needType, setNeedType] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await registerPerson({
        consentLevel: 1,
        activityHint,
        neighborhood: formData.get("neighborhood") as string,
        city: formData.get("city") as string,
        needType: needType || undefined,
        prayerRequest: (formData.get("prayerRequest") as string) || undefined,
      });
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar pessoa — N1</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              list="neighborhood-list"
              required
            />
            <datalist id="neighborhood-list">
              {neighborhoods.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="needType">Tipo de necessidade</Label>
            <select
              id="needType"
              name="needType"
              value={needType}
              onChange={(e) => setNeedType(e.target.value)}
              required
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
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
