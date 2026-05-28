import { pdf } from "@react-pdf/renderer";
import React from "react";
import { RelatorioPDF } from "@/lib/pdf/RelatorioPDF";
import { aggregateForReport } from "@/app/(coord)/export/actions";

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const teamIds = searchParams.getAll("teamId");

  const data = await aggregateForReport({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    teamIds: teamIds.length > 0 ? teamIds : undefined,
  });

  if ("error" in data) {
    return Response.json({ error: data.error }, { status: 403 });
  }

  const stream = await pdf(<RelatorioPDF {...data} />).toBuffer();
  const buffer = await streamToBuffer(stream);

  const eventName = data.evento.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-impacto-${eventName}.pdf"`,
    },
  });
}
