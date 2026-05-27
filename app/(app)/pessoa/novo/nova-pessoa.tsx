import { FormUnificado } from "./form-unificado";

interface NovaPessoaProps {
  activityHint?: string;
  neighborhoods: string[];
  initialConsentLevel: number | null;
}

export function NovaPessoa({ activityHint, neighborhoods }: NovaPessoaProps) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="p-4 pb-2">
        <h1 className="text-xl font-bold">Registrar pessoa</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha só o que a pessoa consentiu compartilhar.
        </p>
      </div>
      <FormUnificado
        activityHint={activityHint}
        neighborhoods={neighborhoods}
      />
    </div>
  );
}
