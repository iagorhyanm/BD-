"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { alternarAberto } from "@/server/actions/formularios";
import type { Situacao } from "@/lib/inscricao";

const EXPLICACAO: Record<Situacao, string> = {
  aberto: "O link está aceitando inscrições agora.",
  fechado: "O link mostra que as inscrições estão fechadas.",
  agendado: "Aberto, mas só começa a aceitar na data de abertura.",
  encerrado: "Aberto, mas a data de fechamento já passou.",
  esgotado: "Aberto, mas o limite de inscrições foi atingido.",
};

export function AberturaFormulario({ id, aberto, situacao }: { id: string; aberto: boolean; situacao: Situacao }) {
  const [pendente, iniciar] = useTransition();
  return (
    <label className="flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex-1">
        <p className="font-semibold">Receber inscrições</p>
        <p className="text-sm text-muted-foreground">{EXPLICACAO[situacao]}</p>
      </div>
      <Switch
        checked={aberto}
        disabled={pendente}
        aria-label="Receber inscrições"
        onCheckedChange={(v) =>
          iniciar(async () => {
            const r = await alternarAberto(id, v);
            if (!r.ok) toast.error(r.erro);
            else toast.success(v ? "Inscrições abertas!" : "Inscrições fechadas.");
          })
        }
        className="scale-125"
      />
    </label>
  );
}
