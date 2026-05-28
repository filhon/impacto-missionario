"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";

interface Props {
  eventId: string;
  startDate: string;
  endDate: string;
  selectedTeams: Set<string>;
}

export function ExportPdfCard({
  eventId,
  startDate,
  endDate,
  selectedTeams,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      for (const id of selectedTeams) {
        params.append("teamId", id);
      }

      const res = await fetch(`/api/export/pdf?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Erro ao gerar PDF");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-impacto-${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4" />
          Exportar PDF
        </CardTitle>
        <CardDescription>
          Relatório consolidado do evento em PDF.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDownload} disabled={loading} variant="outline">
          <FileText className="size-4" />
          {loading ? "Gerando PDF…" : "Baixar PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
