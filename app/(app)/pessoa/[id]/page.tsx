import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CONSENT_LABELS = [
  "Anônimo",
  "Localização",
  "Identificado",
  "Completo",
] as const;

const CONSENT_BADGE: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  3: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

async function getSignedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  // If already a full URL (legacy records stored signed URLs), return as-is.
  if (value.startsWith("http")) return value;
  // Otherwise treat value as a storage path and generate a fresh signed URL.
  const { data } = await supabase.storage
    .from("people-photos")
    .createSignedUrl(value, 3600); // 1-hour expiry
  return data?.signedUrl ?? null;
}

export default async function PessoaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: person } = await supabase
    .from("people_reached")
    .select("*")
    .eq("id", id)
    .single();

  if (!person) notFound();

  const [photoUrl, consentProofUrl] = await Promise.all([
    getSignedUrl(supabase, person.photo_url),
    getSignedUrl(supabase, person.consent_proof_url),
  ]);

  const consentLabel = CONSENT_LABELS[person.consent_level] ?? "—";
  const badgeClass = CONSENT_BADGE[person.consent_level] ?? CONSENT_BADGE[0];

  return (
    <div className="flex flex-col gap-6 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/equipe"
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight truncate">
          {person.consent_level >= 2 && person.name
            ? person.name
            : "Pessoa registrada"}
        </h1>
      </div>

      {/* Consent badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Consentimento:</span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          N{person.consent_level} · {consentLabel}
        </span>
      </div>

      {/* Identification (level >= 2) */}
      {person.consent_level >= 2 && (person.name || person.phone) && (
        <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identificação
          </h2>
          {person.name && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Nome</span>
              <span className="text-base font-medium">{person.name}</span>
            </div>
          )}
          {person.phone && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">WhatsApp</span>
              <a
                href={`tel:${person.phone}`}
                className="text-base font-medium text-primary hover:underline"
              >
                {person.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Location */}
      {(person.neighborhood ||
        person.city ||
        (person.address && person.consent_level >= 3)) && (
        <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Localização
          </h2>
          {person.neighborhood && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Bairro</span>
              <span className="text-base">{person.neighborhood}</span>
            </div>
          )}
          {person.city && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Cidade</span>
              <span className="text-base">{person.city}</span>
            </div>
          )}
          {person.address && person.consent_level >= 3 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Endereço</span>
              <span className="text-base">{person.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Spiritual */}
      {(person.conversion_decision ||
        person.need_type ||
        person.prayer_request) && (
        <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Espiritual
          </h2>
          {person.conversion_decision && (
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary shrink-0" />
              <span className="text-base font-semibold text-primary">
                Aceitou a Cristo
              </span>
            </div>
          )}
          {person.need_type && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Necessidade</span>
              <span className="text-base capitalize">{person.need_type}</span>
            </div>
          )}
          {person.prayer_request && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                Pedido de oração
              </span>
              <span className="text-base whitespace-pre-wrap leading-relaxed">
                {person.prayer_request}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Photos (level 3) */}
      {person.consent_level >= 3 && (photoUrl || consentProofUrl) && (
        <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fotos
          </h2>
          <div className="flex flex-wrap gap-4">
            {photoUrl && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Foto</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Foto da pessoa"
                  className="h-32 w-32 rounded-lg object-cover border border-border"
                />
              </div>
            )}
            {consentProofUrl && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Assinatura
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={consentProofUrl}
                  alt="Foto da assinatura"
                  className="h-32 w-32 rounded-lg object-cover border border-border"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registration timestamp */}
      {person.created_at && (
        <p className="text-center text-xs text-muted-foreground">
          Registrado em{" "}
          {format(new Date(person.created_at), "dd/MM/yyyy 'às' HH:mm", {
            locale: ptBR,
          })}
        </p>
      )}
    </div>
  );
}
