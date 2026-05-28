"use client";

import { useSession } from "@/lib/context/session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Users,
  UserCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTeam,
  generateUniqueCode,
  updateTeamName,
  setTeamLeader,
  resetTeamCode,
  removeTeamMember,
  promoteToLeader,
} from "@/app/(coord)/actions";

type TeamWithMembers = {
  id: string;
  name: string;
  code_4dig: string;
  color: string | null;
  leader_id: string | null;
};

type UserInfo = {
  id: string;
  name: string;
  role: string;
  team_id: string | null;
};

export default function CoordEquipesPage() {
  const { event } = useSession();
  const queryClient = useQueryClient();

  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCode, setNewTeamCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [editNameOpen, setEditNameOpen] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const [setLeaderOpen, setSetLeaderOpen] = useState<string | null>(null);
  const [selectedLeader, setSelectedLeader] = useState("");

  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const { data: teams } = useQuery({
    queryKey: ["coord", event?.id, "teams-manage"],
    queryFn: async () => {
      if (!event?.id) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("teams")
        .select("id, name, code_4dig, color, leader_id")
        .eq("event_id", event.id)
        .order("name");
      return (data ?? []) as TeamWithMembers[];
    },
    enabled: !!event?.id,
  });

  const { data: users } = useQuery({
    queryKey: ["coord", event?.id, "users-manage"],
    queryFn: async () => {
      if (!event?.id) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("id, name, role, team_id")
        .eq("event_id", event.id)
        .order("name");
      return (data ?? []) as UserInfo[];
    },
    enabled: !!event?.id,
  });

  const { data: memberCounts } = useQuery({
    queryKey: ["coord", event?.id, "member-counts"],
    queryFn: async () => {
      if (!event?.id) return new Map<string, number>();
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("team_id")
        .eq("event_id", event.id);

      if (!data) return new Map();
      const map = new Map<string, number>();
      for (const row of data) {
        if (row.team_id) {
          map.set(row.team_id, (map.get(row.team_id) ?? 0) + 1);
        }
      }
      return map;
    },
    enabled: !!event?.id,
  });

  const { data: activityTotals } = useQuery({
    queryKey: ["coord", event?.id, "activity-totals-per-team"],
    queryFn: async () => {
      if (!event?.id) return new Map<string, number>();
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_events")
        .select("team_id, count")
        .eq("event_id", event.id);

      if (!data) return new Map();
      const map = new Map<string, number>();
      for (const row of data) {
        if (row.team_id) {
          map.set(row.team_id, (map.get(row.team_id) ?? 0) + row.count);
        }
      }
      return map;
    },
    enabled: !!event?.id,
  });

  const { data: peopleTotals } = useQuery({
    queryKey: ["coord", event?.id, "people-totals-per-team"],
    queryFn: async () => {
      if (!event?.id) return new Map<string, number>();
      const supabase = createClient();
      const { data } = await supabase
        .from("people_reached")
        .select("team_id")
        .eq("event_id", event.id);

      if (!data) return new Map();
      const map = new Map<string, number>();
      for (const row of data) {
        if (row.team_id) {
          map.set(row.team_id, (map.get(row.team_id) ?? 0) + 1);
        }
      }
      return map;
    },
    enabled: !!event?.id,
  });

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    const result = await generateUniqueCode();
    setGeneratingCode(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.code) {
      setNewTeamCode(result.code);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !newTeamCode) {
      toast.error("Preencha o nome e gere um código");
      return;
    }
    setCreatingTeam(true);
    const formData = new FormData();
    formData.set("name", newTeamName);
    formData.set("code", newTeamCode);
    const result = await createTeam(formData);
    setCreatingTeam(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Equipe criada!");
      setNewTeamOpen(false);
      setNewTeamName("");
      setNewTeamCode("");
      queryClient.invalidateQueries({ queryKey: ["coord", event?.id] });
    }
  };

  const handleEditName = async (teamId: string) => {
    if (!editNameValue.trim()) return;
    const result = await updateTeamName(teamId, editNameValue);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Nome atualizado!");
      setEditNameOpen(null);
      queryClient.invalidateQueries({ queryKey: ["coord", event?.id] });
    }
  };

  const handleSetLeader = async (teamId: string) => {
    if (!selectedLeader) return;
    const result = await setTeamLeader(teamId, selectedLeader);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Líder definido!");
      setSetLeaderOpen(null);
      setSelectedLeader("");
      queryClient.invalidateQueries({ queryKey: ["coord", event?.id] });
    }
  };

  const handleResetCode = async (teamId: string) => {
    const result = await resetTeamCode(teamId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Novo código: ${result.code}`);
      queryClient.invalidateQueries({ queryKey: ["coord", event?.id] });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const result = await removeTeamMember(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Membro removido");
      queryClient.invalidateQueries({ queryKey: ["coord", event?.id] });
    }
  };

  const handlePromoteToLeader = async (teamId: string, userId: string) => {
    const result = await promoteToLeader(teamId, userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Promovido a líder!");
      queryClient.invalidateQueries({ queryKey: ["coord", event?.id] });
    }
  };

  if (!event?.id) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">Evento não encontrado.</p>
      </div>
    );
  }

  const teamUsers = (teamId: string) =>
    (users ?? []).filter((u) => u.team_id === teamId);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Equipes</h1>
        <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="size-4" />
            Nova equipe
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova equipe</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Nome da equipe
                </label>
                <Input
                  placeholder="Ex: Equipe Azul"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Código de acesso (4 dígitos)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="0000"
                    value={newTeamCode}
                    onChange={(e) =>
                      setNewTeamCode(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    className="font-mono tracking-widest"
                    maxLength={4}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                  >
                    <RefreshCw
                      className={`size-3.5 ${generatingCode ? "animate-spin" : ""}`}
                    />
                    Gerar
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <DialogClose render={<Button variant="outline" size="sm" />}>
                  Cancelar
                </DialogClose>
                <Button
                  size="sm"
                  onClick={handleCreateTeam}
                  disabled={creatingTeam || !newTeamName.trim() || !newTeamCode}
                >
                  {creatingTeam ? "Criando..." : "Criar equipe"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {teams !== undefined && teams.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Nenhuma equipe criada ainda.
            <br />
            Clique em &quot;Nova equipe&quot; para começar.
          </div>
        )}
        {teams?.map((team) => {
          const members = teamUsers(team.id);
          const isExpanded = expandedTeam === team.id;
          const currentLeader = users?.find((u) => u.id === team.leader_id);
          const memberCount = memberCounts?.get(team.id) ?? 0;
          const activityCount = activityTotals?.get(team.id) ?? 0;
          const peopleCount = peopleTotals?.get(team.id) ?? 0;

          return (
            <Card key={team.id} className="overflow-hidden rounded-2xl">
              {/* Team color accent strip — thicker for visual anchor */}
              <div
                className="h-1.5"
                style={{ backgroundColor: team.color ?? "#0ea5e9" }}
              />

              <CardHeader className="px-4 pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-snug">
                      {team.name}
                    </CardTitle>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3" />
                      {memberCount} {memberCount === 1 ? "membro" : "membros"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Editar nome da equipe"
                    className="mt-0.5 shrink-0"
                    onClick={() => {
                      setEditNameOpen(team.id);
                      setEditNameValue(team.name);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Dialog
                    open={editNameOpen === team.id}
                    onOpenChange={(open) => {
                      if (!open) setEditNameOpen(null);
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar nome da equipe</DialogTitle>
                      </DialogHeader>
                      <Input
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <DialogClose
                          render={<Button variant="outline" size="sm" />}
                        >
                          Cancelar
                        </DialogClose>
                        <Button
                          size="sm"
                          onClick={() => handleEditName(team.id)}
                        >
                          Salvar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-1">
                {/* Code + reset */}
                <div className="flex items-center justify-between">
                  <code className="rounded-md bg-muted px-3 py-2 font-mono text-2xl tracking-[0.3em] tabular-nums">
                    {team.code_4dig}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (
                        window.confirm(
                          `O código "${team.code_4dig}" vai parar de funcionar. Gerar um novo?`,
                        )
                      ) {
                        handleResetCode(team.id);
                      }
                    }}
                  >
                    <RefreshCw className="size-3.5" />
                    Resetar
                  </Button>
                </div>

                {/* Activity + people totals */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/60 px-3 py-2 text-center">
                    <p className="text-lg font-bold tabular-nums leading-none">
                      {activityCount}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      atividades
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/60 px-3 py-2 text-center">
                    <p className="text-lg font-bold tabular-nums leading-none">
                      {peopleCount}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      pessoas
                    </p>
                  </div>
                </div>

                {/* Leader row */}
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">
                      {currentLeader?.name ?? (
                        <span className="italic text-muted-foreground">
                          Sem líder
                        </span>
                      )}
                    </span>
                  </div>
                  <Dialog
                    open={setLeaderOpen === team.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setSetLeaderOpen(team.id);
                        setSelectedLeader(team.leader_id ?? "");
                      } else {
                        setSetLeaderOpen(null);
                      }
                    }}
                  >
                    <DialogTrigger
                      render={
                        <Button variant="ghost" size="xs">
                          <UserCheck className="size-3" />
                          Definir
                        </Button>
                      }
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Definir líder</DialogTitle>
                      </DialogHeader>
                      <Select
                        value={selectedLeader}
                        onValueChange={(v) => v && setSelectedLeader(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um membro" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamUsers(team.id).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                              {u.role === "lider" ? " (líder)" : ""}
                              {u.role === "coord" ? " (coord)" : ""}
                            </SelectItem>
                          ))}
                          {teamUsers(team.id).length === 0 && (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              Nenhum membro na equipe
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 justify-end">
                        <DialogClose
                          render={<Button variant="outline" size="sm" />}
                        >
                          Cancelar
                        </DialogClose>
                        <Button
                          size="sm"
                          onClick={() => handleSetLeader(team.id)}
                          disabled={!selectedLeader}
                        >
                          Salvar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Member toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  className="-mx-1 flex items-center gap-1.5 rounded px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                  Ver membros ({members.length})
                </button>

                {/* Expanded member list */}
                {isExpanded && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    {members.length === 0 && (
                      <p className="py-3 text-center text-sm text-muted-foreground">
                        Nenhum membro nesta equipe.
                      </p>
                    )}
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{member.name}</span>
                          {member.role === "lider" && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                              <ShieldCheck className="size-2.5" />
                              Líder
                            </span>
                          )}
                          {member.role === "coord" && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                              <Shield className="size-2.5" />
                              Coord
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {member.role === "voluntario" && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() =>
                                handlePromoteToLeader(team.id, member.id)
                              }
                            >
                              <UserCheck className="size-3" />
                              Promover
                            </Button>
                          )}
                          {member.role !== "coord" && (
                            <Button
                              variant="ghost"
                              size="xs"
                              aria-label="Remover membro"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="size-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
