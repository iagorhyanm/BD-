import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Seleção" };

export default function Page() {
  return <EmBreve titulo="Seleção" fase={2} />;
}
