import { notFound } from "next/navigation";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";
import { CounterScreen } from "@/components/counter-screen";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ tipo: string }>;
}) {
  const { tipo } = await params;

  if (!(tipo in ACTIVITY_TYPES)) {
    notFound();
  }

  return <CounterScreen tipo={tipo as ActivityType} />;
}
