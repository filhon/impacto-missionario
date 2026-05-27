"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { loginWithCode } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginWithCode(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-6 pt-8 text-center">
          <CardTitle className="text-3xl font-bold">
            Impacto Missionário
          </CardTitle>
          <p className="mt-3 text-sm text-muted-foreground">
            Código da equipe + seu nome para entrar
          </p>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código da equipe</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                className="text-center text-3xl tracking-widest"
                autoFocus
                required
                placeholder=""
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                placeholder=""
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(opcional)"
              />
            </div>

            {error && (
              <p className="text-destructive text-center text-sm">{error}</p>
            )}

            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
