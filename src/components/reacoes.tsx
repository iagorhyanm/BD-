"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EMOJIS_REACAO } from "@/lib/biblia";
import { alternarReacao } from "@/server/actions/checkins";
import { cn } from "@/lib/utils";

type R = { emoji: string; total: number; minha: boolean };

/** Barra de reações: toque para reagir/desfazer (atualiza na hora). */
export function Reacoes({ checkinId, iniciais, atualizarPagina = false }: { checkinId: string; iniciais: R[]; atualizarPagina?: boolean }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [reacoes, alternar] = useOptimistic(iniciais, (atual: R[], emoji: string) => {
    const r = atual.find((x) => x.emoji === emoji);
    if (!r) return [...atual, { emoji, total: 1, minha: true }];
    return atual
      .map((x) => (x.emoji === emoji ? { ...x, minha: !x.minha, total: x.total + (x.minha ? -1 : 1) } : x))
      .filter((x) => x.total > 0);
  });

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reações">
      {EMOJIS_REACAO.map((emoji) => {
        const r = reacoes.find((x) => x.emoji === emoji);
        return (
          <button
            key={emoji}
            type="button"
            aria-pressed={!!r?.minha}
            aria-label={`Reagir com ${emoji}${r ? ` (${r.total})` : ""}`}
            onClick={() =>
              iniciar(async () => {
                alternar(emoji);
                const res = await alternarReacao(checkinId, emoji);
                if (!res.ok) toast.error(res.erro);
                // Na página da leitura, atualiza a lista "Quem reagiu".
                else if (atualizarPagina) router.refresh();
              })
            }
            className={cn(
              "flex h-9 min-w-11 items-center justify-center gap-1 rounded-full border px-2.5 text-sm transition-colors",
              r?.minha ? "border-primary bg-primary/10 font-semibold" : "bg-background hover:bg-muted",
              !r && "opacity-70",
            )}
          >
            <span aria-hidden>{emoji}</span>
            {r && <span className="tabular-nums">{r.total}</span>}
          </button>
        );
      })}
    </div>
  );
}
