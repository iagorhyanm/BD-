"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { EstadoVazio } from "@/components/estado-vazio";
import { formatarDataHora } from "@/lib/datas";
import { CLASSE_TIPO_EVENTO, ROTULO_TIPO_EVENTO, situacaoFaltas, type TipoEvento } from "@/lib/dominio";
import { cn } from "@/lib/utils";

type Ev = { id: string; titulo: string; tipo: TipoEvento; inicio: string; registros: number; presentes: number };
type Linha = { membroId: string; nome: string; registros: number; presentes: number; atrasos: number; faltas: number; justificadas: number; percentual: number | null };

export function VisaoPresenca({
  abaInicial,
  eventos,
  resumo,
  limite,
  totalAtivos,
}: {
  abaInicial: "chamadas" | "relatorio";
  eventos: Ev[];
  resumo: Linha[];
  limite: number;
  totalAtivos: number;
}) {
  const [aba, setAba] = useState(abaInicial);
  const acima = resumo.filter((r) => situacaoFaltas(r.faltas, limite) === "passou").length;

  return (
    <div className="space-y-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg border bg-card p-1">
        {(
          [
            ["chamadas", "Chamadas"],
            ["relatorio", `Relatório${acima ? ` (${acima} ⚠)` : ""}`],
          ] as const
        ).map(([v, r]) => (
          <button
            key={v}
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className={cn("min-h-10 rounded-md text-sm font-medium", aba === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {r}
          </button>
        ))}
      </div>

      {aba === "chamadas" ? (
        eventos.length === 0 ? (
          <EstadoVazio icone={ClipboardCheck} titulo="Nenhum evento até hoje" descricao="Cadastre ensaios na Agenda para fazer a chamada." />
        ) : (
          <ul className="space-y-2">
            {eventos.map((e) => (
              <li key={e.id}>
                <Link href={`/presenca/${e.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40">
                  <div className="min-w-0 flex-1">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", CLASSE_TIPO_EVENTO[e.tipo])}>
                      {ROTULO_TIPO_EVENTO[e.tipo]}
                    </span>
                    <p className="mt-1 truncate font-semibold">{e.titulo}</p>
                    <p className="text-sm text-muted-foreground">{formatarDataHora(e.inicio, "dd/MM/yyyy · HH:mm")}</p>
                  </div>
                  {e.registros ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                      {e.presentes}/{e.registros} presentes
                    </span>
                  ) : (
                    <span className="rounded-full bg-destaque/30 px-2.5 py-1 text-xs font-semibold">Fazer chamada</span>
                  )}
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : resumo.length === 0 ? (
        <EstadoVazio icone={ClipboardCheck} titulo="Sem membros ativos" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Relatório de presença por membro ({totalAtivos} ativos)</caption>
            <thead className="border-b bg-muted/60 text-left">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">Membro</th>
                <th scope="col" className="px-2 py-2.5 text-right font-semibold">% presença</th>
                <th scope="col" className="px-2 py-2.5 text-right font-semibold">Presenças</th>
                <th scope="col" className="px-2 py-2.5 text-right font-semibold">Atrasos</th>
                <th scope="col" className="px-2 py-2.5 text-right font-semibold">Justif.</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Faltas</th>
              </tr>
            </thead>
            <tbody>
              {resumo.map((r) => {
                const sit = situacaoFaltas(r.faltas, limite);
                return (
                  <tr key={r.membroId} className={cn("border-b last:border-0", sit === "passou" && "bg-rose-50", sit === "no_limite" && "bg-amber-50")}>
                    <th scope="row" className="px-3 py-2.5 text-left font-medium">
                      <Link href={`/membros/${r.membroId}`} className="hover:underline">{r.nome}</Link>
                      {sit === "passou" && <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">passou do limite</span>}
                      {sit === "no_limite" && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">no limite</span>}
                    </th>
                    <td className="px-2 py-2.5 text-right font-semibold">{r.percentual === null ? "—" : `${r.percentual}%`}</td>
                    <td className="px-2 py-2.5 text-right">{r.presentes}</td>
                    <td className="px-2 py-2.5 text-right">{r.atrasos}</td>
                    <td className="px-2 py-2.5 text-right">{r.justificadas}</td>
                    <td className={cn("px-3 py-2.5 text-right font-semibold", sit === "passou" && "text-rose-700")}>{r.faltas}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
