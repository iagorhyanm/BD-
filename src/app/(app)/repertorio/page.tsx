import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Repertório" };

export default function Page() {
  return <EmBreve titulo="Repertório" fase={4} />;
}
