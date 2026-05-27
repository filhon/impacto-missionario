"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CONSENT_TEXTS } from "@/lib/consent/texts";
import { savePersonLocal } from "@/lib/dexie/repos";
import { uuidv7 } from "@/lib/uuid/v7";
import { registerPerson, checkDuplicatePerson } from "./actions";
import { compressImage } from "@/lib/image/compress";
import { createClient } from "@/lib/supabase/client";

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

interface FormUnificadoProps {
  activityHint?: string;
  neighborhoods: string[];
}

export function FormUnificado({
  activityHint,
  neighborhoods,
}: FormUnificadoProps) {
  const [isPending, startTransition] = useTransition();

  // Seção 1: Dados básicos (sempre visível)
  const [conversionDecision, setConversionDecision] = useState(false);
  const [needType, setNeedType] = useState("");

  // Seção 2: Identificação (expansível)
  const [showIdentification, setShowIdentification] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [phone, setPhone] = useState("");

  // Seção 3: Dados completos (expansível, só se consentido)
  const [showFullData, setShowFullData] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [consentFile, setConsentFile] = useState<File | null>(null);

  // Duplicata
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setPhone(formatPhone(digits));
  }

  async function uploadFile(
    supabase: ReturnType<typeof createClient>,
    file: File,
    userId: string,
    clientEventId: string,
    name: string,
  ): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
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
          if (attempt < 2)
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        const { data } = await supabase.storage
          .from("people-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        return data?.signedUrl ?? null;
      } catch {
        if (attempt < 2)
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = (formData.get("name") as string)?.trim() ?? "";
    const neighborhood = (formData.get("neighborhood") as string)?.trim() ?? "";
    const city = (formData.get("city") as string)?.trim() ?? "";
    const prayerRequest =
      (formData.get("prayerRequest") as string)?.trim() ?? "";
    const address = (formData.get("address") as string)?.trim() ?? "";
    const phoneDigits = phone.replace(/\D/g, "");

    // Validações condicionais
    if (showIdentification && consentChecked) {
      if (name && name.length < 2) {
        toast.error("Nome muito curto");
        return;
      }
      if (showFullData && photoFile && !consentFile) {
        toast.error("Adicione a foto da assinatura");
        return;
      }
    }

    // Verificação de duplicata (só se tiver nome e consentimento e não estiver pulando)
    if (name && consentChecked && !skipDuplicateCheck) {
      const phoneForCheck = phoneDigits.length >= 10 ? phoneDigits : undefined;
      const { duplicate, existingName } = await checkDuplicatePerson(
        name,
        phoneForCheck,
      );
      if (duplicate) {
        setDuplicateWarning(
          `"${existingName}" já está registrado neste evento. Quer continuar mesmo assim?`,
        );
        return;
      }
    }

    setSkipDuplicateCheck(false); // reset para próximas submissões
    setDuplicateWarning(null);

    startTransition(async () => {
      const clientEventId = uuidv7();
      const hasAddress = !!address;
      const hasPhoto = !!(photoFile || consentFile);
      const hasAnonymousData = !!(
        neighborhood ||
        city ||
        needType ||
        prayerRequest
      );

      let consentLevel: number;
      if (name && consentChecked) {
        consentLevel = hasAddress || hasPhoto ? 3 : 2;
      } else if (hasAnonymousData) {
        consentLevel = 1;
      } else {
        consentLevel = 0;
      }

      const consentTextShown = consentChecked
        ? CONSENT_TEXTS[consentLevel === 3 ? 3 : 2]
        : undefined;

      let photoUrl: string | undefined;
      let consentProofUrl: string | undefined;

      if (consentLevel === 3 && (photoFile || consentFile)) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [pu, cu] = await Promise.all([
            photoFile
              ? uploadFile(supabase, photoFile, user.id, clientEventId, "photo")
              : Promise.resolve(null),
            consentFile
              ? uploadFile(
                  supabase,
                  consentFile,
                  user.id,
                  clientEventId,
                  "consent",
                )
              : Promise.resolve(null),
          ]);
          photoUrl = pu ?? undefined;
          consentProofUrl = cu ?? undefined;
        }
      }

      try {
        await savePersonLocal({
          client_event_id: clientEventId,
          consent_level: consentLevel as 0 | 1 | 2 | 3,
          name: name && consentChecked ? name : undefined,
          phone:
            name && consentChecked && phoneDigits.length >= 10
              ? phoneDigits
              : undefined,
          neighborhood: neighborhood || undefined,
          city: city || undefined,
          need_type: needType || undefined,
          prayer_request: prayerRequest || undefined,
          conversion_decision: conversionDecision || undefined,
          consent_text_shown: consentTextShown,
          consent_timestamp: consentChecked
            ? new Date().toISOString()
            : undefined,
          address: address || undefined,
          photo_url: photoUrl,
          consent_proof_url: consentProofUrl,
        });
      } catch {
        toast.error("Erro ao salvar localmente");
        return;
      }

      const result = await registerPerson({
        clientEventId,
        consentLevel,
        activityHint,
        name: name && consentChecked ? name : undefined,
        phone:
          name && consentChecked && phoneDigits.length >= 10
            ? phoneDigits
            : undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        needType: needType || undefined,
        prayerRequest: prayerRequest || undefined,
        conversionDecision,
        consentTextShown,
        address: address || undefined,
        photoUrl,
        consentProofUrl,
      });

      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 p-4 pb-8">
      {/* Conversão */}
      <label className="flex items-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 cursor-pointer">
        <Checkbox
          checked={conversionDecision}
          onCheckedChange={(v) => setConversionDecision(v === true)}
          className="size-6 shrink-0"
        />
        <span className="text-base font-semibold leading-snug">
          Aceitou a Cristo hoje
        </span>
      </label>

      {/* Dados anônimos */}
      <div className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Localização e necessidade
        </h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="neighborhood" className="text-base">
            Bairro
          </Label>
          <Input
            id="neighborhood"
            name="neighborhood"
            list="neighborhood-list"
            className="h-12 text-base"
          />
          <datalist id="neighborhood-list">
            {neighborhoods.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city" className="text-base">
            Cidade
          </Label>
          <Input id="city" name="city" className="h-12 text-base" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="needType" className="text-base">
            Tipo de necessidade
          </Label>
          <select
            id="needType"
            name="needType"
            value={needType}
            onChange={(e) => setNeedType(e.target.value)}
            className="h-12 w-full rounded-lg border border-input bg-transparent px-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          >
            <option value="">Selecione...</option>
            {NEED_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prayerRequest" className="text-base">
            Pedido de oração{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <Textarea
            id="prayerRequest"
            name="prayerRequest"
            maxLength={500}
            rows={3}
            className="text-base"
          />
        </div>
      </div>

      {/* Identificação */}
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => {
            setShowIdentification((v) => !v);
            if (showIdentification) {
              setConsentChecked(false);
              setPhone("");
              setShowFullData(false);
            }
          }}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <div>
            <p className="text-base font-semibold">Identificar pessoa</p>
            <p className="text-sm text-muted-foreground">
              Nome e contato, com consentimento da pessoa
            </p>
          </div>
          {showIdentification ? (
            <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
          )}
        </button>

        {showIdentification && (
          <div className="flex flex-col gap-5 pl-1">
            {/* Consentimento */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-primary">
                Leia em voz alta para a pessoa:
              </p>
              <p className="text-base leading-relaxed">{CONSENT_TEXTS[2]}</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={consentChecked}
                  onCheckedChange={(v) => setConsentChecked(v === true)}
                  className="mt-0.5 size-5 shrink-0"
                />
                <span className="text-sm text-muted-foreground leading-snug">
                  Li em voz alta e a pessoa concordou
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-base">
                Nome{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id="name"
                name="name"
                disabled={!consentChecked}
                className="h-12 text-base disabled:opacity-40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone" className="text-base">
                WhatsApp{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                disabled={!consentChecked}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(XX) XXXXX-XXXX"
                className="h-12 text-base disabled:opacity-40"
              />
            </div>

            {/* Dados completos */}
            {consentChecked && (
              <button
                type="button"
                onClick={() => setShowFullData((v) => !v)}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-base font-semibold">Dados completos</p>
                  <p className="text-sm text-muted-foreground">
                    Endereço, foto e assinatura
                  </p>
                </div>
                {showFullData ? (
                  <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
                )}
              </button>
            )}

            {consentChecked && showFullData && (
              <div className="flex flex-col gap-4 pl-1">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address" className="text-base">
                    Endereço{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </Label>
                  <Textarea
                    id="address"
                    name="address"
                    rows={2}
                    className="text-base"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="photo" className="text-base">
                    Foto da pessoa
                  </Label>
                  <Input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    className="h-12 text-base"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="consentPhoto" className="text-base">
                    Foto da assinatura
                  </Label>
                  <Input
                    id="consentPhoto"
                    name="consentPhoto"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) =>
                      setConsentFile(e.target.files?.[0] ?? null)
                    }
                    className="h-12 text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    Imprima o texto de consentimento, peça para assinar e tire
                    foto.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {duplicateWarning && (
        <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-destructive">
            {duplicateWarning}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDuplicateWarning(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setSkipDuplicateCheck(true);
                setDuplicateWarning(null);
              }}
              className="flex-1"
            >
              Registrar mesmo assim
            </Button>
          </div>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="h-14 text-base font-semibold"
      >
        {isPending ? "Registrando..." : "Registrar pessoa"}
      </Button>
    </form>
  );
}
