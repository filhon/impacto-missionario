"use client";

import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfirmacaoPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <CircleCheck className="size-20 text-primary" />
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold">Registrado!</h1>
          <p className="text-sm text-muted-foreground">
            Dados salvos localmente e enviados quando houver conexão.
          </p>
        </div>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push("/pessoa/novo")}
        >
          Registrar outra pessoa
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/")}
        >
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
