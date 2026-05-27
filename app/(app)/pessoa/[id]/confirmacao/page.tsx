"use client";

import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfirmacaoPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center">
      <CircleCheck className="size-16 text-primary" />
      <h1 className="text-3xl font-bold">Registrado!</h1>
      <div className="flex gap-3">
        <Button onClick={() => router.push("/pessoa/novo")}>
          Registrar outra pessoa
        </Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Voltar pra home
        </Button>
      </div>
    </div>
  );
}
