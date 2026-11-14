import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Equipamentos" };

export default function Page() {
  return <EmBreve titulo="Equipamentos" fase={4} />;
}
