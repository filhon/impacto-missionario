"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ACTIVITY_TYPES } from "@/types/domain";

interface Props {
  evento: {
    name: string;
    start_date: string;
    end_date: string;
    region: string;
  };
  totais: {
    biblia: number;
    joao: number;
    folheto: number;
    visita: number;
    oracao: number;
    conversao: number;
    medico: number;
    radio: number;
  };
  totalPessoas: number;
  totalConversoes: number;
  bairrosAlcancados: string[];
  porDia: Array<{
    data: string;
    totais: Record<string, number>;
    porEquipe: Array<{ equipe: string; total: number }>;
  }>;
}

const KPI_ORDER: Array<keyof typeof ACTIVITY_TYPES> = [
  "biblia",
  "joao",
  "folheto",
  "visita",
  "oracao",
  "conversao",
  "medico",
  "radio",
];

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiDot, { backgroundColor: color }]} />
      <View style={styles.kpiTextBlock}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  );
}

export function RelatorioPDF({
  evento,
  totais,
  totalPessoas,
  totalConversoes,
  bairrosAlcancados,
  porDia,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverContent}>
          <Text style={styles.coverLabel}>Relatório de Impacto</Text>
          <Text style={styles.coverTitle}>{evento.name}</Text>
          <View style={styles.coverDivider} />
          <Text style={styles.coverMeta}>
            {formatDate(evento.start_date)} — {formatDate(evento.end_date)}
          </Text>
          <Text style={styles.coverMeta}>{evento.region}</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Resumo</Text>
        <View style={styles.kpiGrid}>
          {KPI_ORDER.map((type) => (
            <KpiCard
              key={type}
              label={ACTIVITY_TYPES[type].label}
              value={totais[type] ?? 0}
              color={ACTIVITY_TYPES[type].color}
            />
          ))}
          <KpiCard
            label="Pessoas alcançadas"
            value={totalPessoas}
            color="#6366f1"
          />
          <KpiCard label="Conversões" value={totalConversoes} color="#ef4444" />
        </View>
      </Page>

      {porDia.map((dia) => {
        const teamEntries = Object.entries(
          Object.fromEntries(dia.porEquipe.map((e) => [e.equipe, e.total])),
        );
        const typeEntries = Object.entries(dia.totais).filter(([, v]) => v > 0);

        return (
          <Page key={dia.data} size="A4" style={styles.page}>
            <Text style={styles.h1}>{formatDate(dia.data)}</Text>

            {teamEntries.length > 0 && (
              <View style={styles.tableSection}>
                <Text style={styles.h2}>Total por equipe</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { flex: 2 },
                      ]}
                    >
                      Equipe
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { flex: 1 },
                      ]}
                    >
                      Total
                    </Text>
                  </View>
                  {teamEntries.map(([equipe, total]) => (
                    <View key={equipe} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {equipe}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellNumber,
                          { flex: 1 },
                        ]}
                      >
                        {total}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {typeEntries.length > 0 && (
              <View style={styles.tableSection}>
                <Text style={styles.h2}>Total por atividade</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { flex: 2 },
                      ]}
                    >
                      Atividade
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { flex: 1 },
                      ]}
                    >
                      Total
                    </Text>
                  </View>
                  {typeEntries.map(([type, total]) => (
                    <View key={type} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {ACTIVITY_TYPES[type as keyof typeof ACTIVITY_TYPES]
                          ?.label ?? type}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCellNumber,
                          { flex: 1 },
                        ]}
                      >
                        {total}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Page>
        );
      })}

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Bairros alcançados</Text>
        <View style={styles.neighborhoodsGrid}>
          {bairrosAlcancados.map((b) => (
            <Text key={b} style={styles.neighborhoodItem}>
              • {b}
            </Text>
          ))}
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Política de retenção de dados</Text>
        <Text style={styles.body}>
          Este relatório agrega dados coletados durante o avanço missionário com
          base nos seguintes níveis de consentimento:
        </Text>
        <Text style={styles.body}>
          {"\n"}• N0 — Pessoas contadas anonimamente, sem dados pessoais
          retidos.
          {"\n"}• N1 — Bairro e tipo de necessidade, sem identificação pessoal.
          {"\n"}• N2 — Nome e contato com consentimento explícito, retenção de
          12 meses.
          {"\n"}• N3 — Cadastro completo com consentimento formal documentado,
          retenção de 24 meses.
        </Text>
        <Text style={styles.body}>
          {"\n"}
          Pedidos de remoção de dados podem ser feitos a qualquer momento
          conforme LGPD art. 18.
        </Text>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  cover: {
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  coverContent: {
    alignItems: "center",
    paddingHorizontal: 60,
  },
  coverLabel: {
    fontSize: 16,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 12,
  },
  coverDivider: {
    width: 80,
    height: 3,
    backgroundColor: "#6366f1",
    marginBottom: 20,
  },
  coverMeta: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  page: {
    padding: 50,
  },
  h1: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  h2: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 8,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    width: "30%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
  },
  kpiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  kpiTextBlock: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  tableSection: {
    marginBottom: 24,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 11,
    color: "#334155",
  },
  tableCellNumber: {
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  neighborhoodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  neighborhoodItem: {
    fontSize: 12,
    color: "#334155",
    width: "45%",
    marginBottom: 4,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.8,
    color: "#334155",
  },
});
