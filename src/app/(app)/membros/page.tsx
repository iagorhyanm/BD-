import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Membros" };

export default function Page() {
  return <EmBreve titulo="Membros" fase={3} />;
}
