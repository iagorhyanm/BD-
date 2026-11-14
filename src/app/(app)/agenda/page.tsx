import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Agenda e escala" };

export default function Page() {
  return <EmBreve titulo="Agenda e escala" fase={3} />;
}
