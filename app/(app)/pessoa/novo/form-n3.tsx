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
import { compressImage } from "@/lib/image/compress";
import { createClient } from "@/lib/supabase/client";
import { uuidv7 } from "@/lib/uuid/v7";

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

export function FormN3({
  activityHint,
  neighborhoods,
}: {
  activityHint?: string;
  neighborhoods: string[];
}) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [consentChecked, setConsentChecked] = useState(false);
  const [needType, setNeedType] = useState("");
  const [phone, setPhone] = useState("");
  const [conversionDecision, setConversionDecision] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [consentFile, setConsentFile] = useState<File | null>(null);

  const formDisabled = !consentChecked;

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");
    setPhone(formatPhone(digits));
  }

  async function uploadFile(
    file: File,
    userId: string,
    clientEventId: string,
    name: string,
  ): Promise<string | null> {
    try {
      const compressed = await compressImage(file);
      const path = `${userId}/${clientEventId}/${name}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("people-photos")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Erro ao fazer upload:", uploadError);
        return null;
      }

      const { data: signedData } = await supabase.storage
        .from("people-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      return signedData?.signedUrl ?? null;
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      return null;
    }
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

    if (!photoFile) {
      toast.error("Selecione a foto da pessoa");
      return;
    }
    if (!consentFile) {
      toast.error("Selecione a foto da assinatura de consentimento");
      return;
    }

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Não autenticado");
        return;
      }

      const clientEventId = uuidv7();

      const [photoUrl, consentProofUrl] = await Promise.all([
        uploadFile(photoFile, user.id, clientEventId, "photo"),
        uploadFile(consentFile, user.id, clientEventId, "consent"),
      ]);

      if (!photoUrl || !consentProofUrl) {
        toast.error("Erro ao fazer upload das imagens");
        return;
      }

      const result = await registerPerson({
        clientEventId,
        consentLevel: 3,
        activityHint,
        name,
        phone: phoneDigits,
        neighborhood: (formData.get("neighborhood") as string) || undefined,
        city: (formData.get("city") as string) || undefined,
        needType: needType || undefined,
        prayerRequest: (formData.get("prayerRequest") as string) || undefined,
        conversionDecision,
        consentTextShown: CONSENT_TEXTS[3],
        address: (formData.get("address") as string) || undefined,
        photoUrl,
        consentProofUrl,
      });
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar pessoa — N3</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="rounded-lg border-2 border-primary p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">
              Leia em voz alta pra pessoa:
            </p>
            <p className="text-lg">{CONSENT_TEXTS[3]}</p>
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

          <div className="space-y-1">
            <Label htmlFor="address">
              Endereço <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="address"
              name="address"
              rows={2}
              disabled={formDisabled}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="photo">Foto da pessoa</Label>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              capture="environment"
              disabled={formDisabled}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPhotoFile(file);
              }}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="consentPhoto">
              Foto da assinatura de consentimento
            </Label>
            <Input
              id="consentPhoto"
              name="consentPhoto"
              type="file"
              accept="image/*"
              capture="environment"
              disabled={formDisabled}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setConsentFile(file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Entregue um papel impresso com o texto de consentimento para a
              pessoa assinar. Uma simples linha como "Eu, ____, autorizo..." é
              suficiente.
            </p>
          </div>
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
