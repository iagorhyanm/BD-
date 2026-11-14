import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Inscrições" };

export default function Page() {
  return <EmBreve titulo="Inscrições" fase={2} />;
}
