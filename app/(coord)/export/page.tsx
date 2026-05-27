"use client";

import { useSession } from "@/lib/context/session";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportCsv } from "./actions";

export default function ExportPage() {
  const { event } = useSession();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const { data: eventInfo } = useQuery({
    queryKey: ["coord", event?.id, "export-event-info"],
    queryFn: async () => {
      if (!event?.id) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("start_date, end_date")
        .eq("id", event.id)
        .single();
      return data;
    },
    enabled: !!event?.id,
  });

  useEffect(() => {
    if (eventInfo?.start_date && !startDate) {
      setStartDate(eventInfo.start_date);
    }
    if (eventInfo?.end_date && !endDate) {
      setEndDate(eventInfo.end_date);
    }
  }, [eventInfo, startDate, endDate]);

  const { data: teams } = useQuery({
    queryKey: ["coord", event?.id, "export-teams"],
    queryFn: async () => {
      if (!event?.id) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("teams")
        .select("id, name")
        .eq("event_id", event.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!event?.id,
  });

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const allTeamsSelected = selectedTeams.size === 0;

  const handleExport = useCallback(async () => {
    const teamIds =
      selectedTeams.size > 0 ? Array.from(selectedTeams) : undefined;

    setExporting(true);
    try {
      const result = await exportCsv({
        startDate,
        endDate,
        teamIds,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar CSV");
      console.error(err);
    } finally {
      setExporting(false);
    }
  }, [startDate, endDate, selectedTeams]);

  if (!event?.id) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Exportar dados</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-4" />
            Exportar CSV completo
          </CardTitle>
          <CardDescription>
            Exporte todas as atividades registradas no evento em formato CSV
            para abrir no Excel, LibreOffice ou Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>De</Label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Até</Label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Equipes</Label>
            <p className="text-xs text-muted-foreground">
              {allTeamsSelected
                ? "Todas as equipes selecionadas"
                : `${selectedTeams.size} equipe(s) selecionada(s)`}
            </p>
            <div className="flex flex-wrap gap-2">
              {teams?.map((team) => {
                const isChecked = selectedTeams.has(team.id);
                return (
                  <label
                    key={team.id}
                    className={
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm cursor-pointer " +
                      (isChecked
                        ? "border-primary bg-primary/5"
                        : "border-input")
                    }
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleTeam(team.id)}
                    />
                    {team.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Exportando…
                </>
              ) : (
                <Download className="size-4" />
              )}
              Baixar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Exportar PDF
          </CardTitle>
          <CardDescription>
            Relatório consolidado do evento em formato PDF. Disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled variant="outline">
            <FileText className="size-4" />
            Baixar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
