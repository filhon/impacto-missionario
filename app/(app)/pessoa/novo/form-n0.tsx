"use client";

import { useTransition } from "react";
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
import { savePersonLocal } from "@/lib/dexie/repos";
import { uuidv7 } from "@/lib/uuid/v7";

export function FormN0({ activityHint }: { activityHint?: string }) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const clientEventId = uuidv7();

      try {
        await savePersonLocal({
          client_event_id: clientEventId,
          consent_level: 0,
        });
      } catch {
        toast.error("Erro ao salvar localmente");
        return;
      }

      const result = await registerPerson({
        clientEventId,
        consentLevel: 0,
        activityHint,
      });
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmar registro de pessoa anônima</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Será criado um registro anônimo sem dados pessoais.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleConfirm} disabled={isPending}>
          {isPending ? "Registrando..." : "Confirmar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
