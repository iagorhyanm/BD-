import type { Metadata } from "next";
import { requireEdg } from "@/lib/auth";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Log de atividades" };

export default async function Page() {
  await requireEdg();
  return <EmBreve titulo="Log de atividades" fase={5} />;
}
