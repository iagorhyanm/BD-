"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCheck, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EstadoVazio } from "@/components/estado-vazio";
import { AlertaErro } from "@/components/alerta-erro";
import { STATUS_PRESENCA, type StatusPresenca } from "@/lib/dominio";
import { salvarChamada } from "@/server/actions/presenca";
import { cn } from "@/lib/utils";

type Linha = { id: string; nome: string; escalado: boolean; status: StatusPresenca | null; motivo: string };

export function Chamada({ eventoId, inicial }: { eventoId: string; inicial: Linha[] }) {
  const [linhas, setLinhas] = useState(inicial);
  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!sujo) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sujo]);

  const mudar = (id: string, c: Partial<Linha>) => {
    setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, ...c } : l)));
    setSujo(true);
    setErro(null);
  };

  const contagem = Object.fromEntries(STATUS_PRESENCA.map((s) => [s.valor, linhas.filter((l) => l.status === s.valor).length]));
  const semRegistro = linhas.filter((l) => !l.status).length;

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarChamada(
        eventoId,
        linhas.map((l) => ({ membro_id: l.id, status: l.status, motivo: l.motivo || null })),
      );
      if (!r.ok) return setErro(r.erro);
      setSujo(false);
      toast.success("Chamada salva!");
    });
  }

  if (linhas.length === 0) {
    return <EstadoVazio icone={Users} titulo="Nenhum membro ativo" descricao="Cadastre membros para fazer a chamada." />;
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {STATUS_PRESENCA.map((s) => (
          <span key={s.valor} className="rounded-full bg-muted px-2.5 py-1">
            {s.rotulo}: <strong>{contagem[s.valor]}</strong>
          </span>
        ))}
        {semRegistro > 0 && <span className="rounded-full bg-destaque/30 px-2.5 py-1">Sem marcação: <strong>{semRegistro}</strong></span>}
      </div>
      {semRegistro > 0 && (
        <Button
          variant="outline"
          onClick={() => {
            setLinhas((ls) => ls.map((l) => (l.status ? l : { ...l, status: "presente" })));
            setSujo(true);
          }}
        >
          <CheckCheck /> Marcar os {semRegistro} restantes como presentes
        </Button>
      )}

      <ul className="space-y-2">
        {linhas.map((l) => (
          <li key={l.id} className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-semibold">
                {l.nome}
                {l.escalado && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">escalado</span>}
              </p>
            </div>
            <div role="radiogroup" aria-label={`Presença de ${l.nome}`} className="mt-2 grid grid-cols-4 gap-1.5">
              {STATUS_PRESENCA.map((s) => {
                const ativo = l.status === s.valor;
                return (
                  <button
                    key={s.valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => mudar(l.id, { status: ativo ? null : s.valor })}
                    className={cn(
                      "min-h-11 rounded-lg border px-1 text-xs font-semibold sm:text-sm",
                      ativo ? s.classe : "bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {s.valor === "justificada" ? "Justificada" : s.rotulo}
                  </button>
                );
              })}
            </div>
            {l.status === "justificada" && (
              <Input
                className="mt-2"
                value={l.motivo}
                onChange={(e) => mudar(l.id, { motivo: e.target.value })}
                placeholder="Motivo da falta (obrigatório)"
                aria-label={`Motivo da falta de ${l.nome}`}
                aria-invalid={!l.motivo.trim()}
              />
            )}
          </li>
        ))}
      </ul>

      <AlertaErro mensagem={erro} />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 p-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center gap-3 lg:px-8">
          <p className="flex-1 text-sm font-medium">{sujo ? "Alterações não salvas" : "Tudo salvo"}</p>
          <Button onClick={salvar} disabled={pendente || !sujo}>
            <Save /> {pendente ? "Salvando…" : "Salvar chamada"}
          </Button>
        </div>
      </div>
    </div>
  );
}
