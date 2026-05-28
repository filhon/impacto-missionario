"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { loginWithCode } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

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
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-90">
        {/* Brand anchor */}
        <div className="mb-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-primary-foreground"
              aria-hidden="true"
            >
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 2v20M3 7l9 5 9-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Impacto Missionário
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Código da equipe + seu nome para entrar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Código da equipe</Label>
            <InputOTP
              name="code"
              maxLength={4}
              pattern={REGEXP_ONLY_DIGITS}
              value={code}
              onChange={setCode}
              autoFocus
              containerClassName="w-full"
            >
              <InputOTPGroup className="w-full gap-2">
                <InputOTPSlot
                  index={0}
                  className="h-16 flex-1 rounded-lg border border-input text-2xl font-bold"
                />
                <InputOTPSlot
                  index={1}
                  className="h-16 flex-1 rounded-lg border border-input text-2xl font-bold"
                />
                <InputOTPSlot
                  index={2}
                  className="h-16 flex-1 rounded-lg border border-input text-2xl font-bold"
                />
                <InputOTPSlot
                  index={3}
                  className="h-16 flex-1 rounded-lg border border-input text-2xl font-bold"
                />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Seu nome
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              WhatsApp{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="h-12"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-14 w-full text-base font-semibold"
            disabled={isPending}
          >
            {isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
