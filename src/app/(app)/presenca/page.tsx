import type { Metadata } from "next";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Presença" };

export default function Page() {
  return <EmBreve titulo="Presença" fase={3} />;
}
