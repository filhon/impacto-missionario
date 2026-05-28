"use client";

import { useRef } from "react";
import { useSession } from "@/lib/context/session";
import { updateProfile, signOut } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LogOut, Save } from "lucide-react";
import { toast } from "sonner";

export default function PerfilPage() {
  const { user, team } = useSession();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleUpdate(formData: FormData) {
    const result = await updateProfile(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Perfil atualizado");
      formRef.current?.reset();
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col pb-20">
      {/* Page header */}
      <div className="px-4 pt-8 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        {team && (
          <Badge
            variant="outline"
            className="mt-2 flex w-fit items-center gap-1.5 border-none text-xs font-medium"
            style={
              team.color
                ? { backgroundColor: team.color + "20", color: team.color }
                : undefined
            }
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: team.color ?? undefined }}
            />
            {team.name}
          </Badge>
        )}
      </div>

      {/* Edit form — no card wrapper, spacious and field-friendly */}
      <form
        action={handleUpdate}
        ref={formRef}
        className="flex flex-col gap-5 px-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-sm font-semibold">
            Nome
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={user.name}
            required
            minLength={2}
            className="h-12 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className="text-sm font-semibold">
            WhatsApp
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            className="h-12 text-base"
          />
        </div>

        <Button
          type="submit"
          className="mt-2 h-14 w-full text-base font-semibold"
        >
          <Save className="size-4" />
          Salvar
        </Button>
      </form>

      {/* Destructive action — visually separated from the form */}
      <div className="mt-auto px-4 pt-16">
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="h-12 w-full text-sm text-destructive hover:bg-destructive/8 hover:text-destructive"
          >
            <LogOut className="size-4" />
            Sair da conta
          </Button>
        </form>
      </div>
    </div>
  );
}
