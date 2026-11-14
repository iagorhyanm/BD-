import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Avisos" };

export default function Page() {
  return <EmBreve titulo="Avisos" fase={5} />;
}
