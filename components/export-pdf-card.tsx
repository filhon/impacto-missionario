"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  aggregateForReport,
  type AggregateReportFilters,
} from "@/app/(coord)/export/actions";

const PDFDownloadLink = dynamic(
  () =>
    import("@react-pdf/renderer").then((mod) => ({
      default: mod.PDFDownloadLink,
    })),
  { ssr: false },
);

const RelatorioPDF = dynamic(
  () => import("@/lib/pdf/RelatorioPDF").then((mod) => mod.RelatorioPDF),
  { ssr: false },
);

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
  const teamIds =
    selectedTeams.size > 0 ? Array.from(selectedTeams) : undefined;

  const filters: AggregateReportFilters = { startDate, endDate, teamIds };

  const { data, isLoading } = useQuery({
    queryKey: ["coord", eventId, "pdf-report", startDate, endDate, teamIds],
    queryFn: () => aggregateForReport(filters),
    enabled: !!eventId,
  });

  const isError = data && "error" in data;
  const reportData = data && !("error" in data) ? data : null;
  const isReady = !isLoading && reportData;

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
        {isError && (
          <p className="mb-2 text-sm text-destructive">
            {(data as { error: string }).error}
          </p>
        )}
        {isReady ? (
          <PDFDownloadLink
            document={<RelatorioPDF {...reportData} />}
            fileName={`relatorio-impacto-${eventId}.pdf`}
          >
            {({ loading }: { loading: boolean }) => (
              <Button disabled={loading} variant="outline">
                <FileText className="size-4" />
                {loading ? "Gerando PDF…" : "Baixar PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        ) : (
          <Button disabled variant="outline">
            <FileText className="size-4" />
            {isLoading ? "Carregando…" : "Baixar PDF"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
