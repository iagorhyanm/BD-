"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Aba = "placar" | "feed" | "membros";

export function AbasGrupo({ abaInicial, placar, feed, membros }: { abaInicial: Aba; placar: React.ReactNode; feed: React.ReactNode; membros: React.ReactNode }) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const abas: [Aba, string][] = [
    ["placar", "🏆 Placar"],
    ["feed", "📖 Leituras"],
    ["membros", "👥 Pessoas"],
  ];
  return (
    <div className="mt-5 space-y-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1">
        {abas.map(([v, r]) => (
          <button
            key={v}
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className={cn("min-h-10 rounded-lg text-sm font-medium", aba === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {r}
          </button>
        ))}
      </div>
      <div role="tabpanel">{aba === "placar" ? placar : aba === "feed" ? feed : membros}</div>
    </div>
  );
}
