"use client";

import { useRef } from "react";
import { useSession } from "@/lib/context/session";
import { updateProfile, signOut } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>Suas informações de cadastro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Equipe</span>
            {team ? (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 border-none text-xs font-medium"
                style={
                  team.color
                    ? {
                        backgroundColor: team.color + "20",
                        color: team.color,
                      }
                    : undefined
                }
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color ?? undefined }}
                />
                {team.name}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar Perfil</CardTitle>
          <CardDescription>Altere seu nome e telefone</CardDescription>
        </CardHeader>
        <form action={handleUpdate} ref={formRef}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              <Save className="size-4" />
              Salvar
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardFooter className="pt-4">
          <form action={signOut} className="w-full">
            <Button type="submit" variant="destructive" className="w-full">
              <LogOut className="size-4" />
              Sair
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
