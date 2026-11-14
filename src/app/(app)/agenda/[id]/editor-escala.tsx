"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Plus, TriangleAlert, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Funcao } from "@/lib/dominio";
import { adicionarEscala, copiarEscala, removerEscala } from "@/server/actions/eventos";

export type Conflito = { membroId: string; texto: string };
type Escala = { id: string; membroId: string; funcaoId: string; membro: string; funcao: string; ordemFuncao: number };
type Membro = { id: string; nome: string; funcoes: string[] };

export function EditorEscala({
  eventoId,
  escalas,
  membros,
  funcoes,
  conflitos,
  anteriores,
}: {
  eventoId: string;
  escalas: Escala[];
  membros: Membro[];
  funcoes: Funcao[];
  conflitos: Conflito[];
  anteriores: { id: string; rotulo: string }[];
}) {
  const [funcaoId, setFuncaoId] = useState("");
  const [membroId, setMembroId] = useState("");
  const [origem, setOrigem] = useState("");
  const [pendente, iniciar] = useTransition();

  const grupos = useMemo(() => {
    const m = new Map<string, { funcao: string; ordem: number; itens: Escala[] }>();
    for (const e of escalas) {
      const g = m.get(e.funcaoId) ?? { funcao: e.funcao, ordem: e.ordemFuncao, itens: [] };
      g.itens.push(e);
      m.set(e.funcaoId, g);
    }
    return [...m.values()].sort((a, b) => a.ordem - b.ordem);
  }, [escalas]);

  const conflitantes = new Set(conflitos.map((c) => c.membroId));

  // Quem tem a função escolhida aparece primeiro.
  const membrosOrdenados = useMemo(() => {
    if (!funcaoId) return { sugeridos: [], outros: membros };
    return {
      sugeridos: membros.filter((m) => m.funcoes.includes(funcaoId)),
      outros: membros.filter((m) => !m.funcoes.includes(funcaoId)),
    };
  }, [membros, funcaoId]);

  function adicionar() {
    if (!funcaoId || !membroId) return toast.error("Escolha a função e a pessoa.");
    iniciar(async () => {
      const r = await adicionarEscala(eventoId, membroId, funcaoId);
      if (!r.ok) return void toast.error(r.erro);
      setMembroId("");
      toast.success("Escalado!");
    });
  }

  const selectCls = "h-11 w-full rounded-lg border border-input bg-background px-3 md:h-10";

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Escala</h2>
        <span className="text-sm text-muted-foreground">
          {(() => {
            const n = new Set(escalas.map((e) => e.membroId)).size;
            return `${n} ${n === 1 ? "pessoa" : "pessoas"}`;
          })()}
        </span>
      </div>

      {conflitos.length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4" aria-hidden /> Atenção na escala
          </p>
          <ul className="list-disc pl-5">
            {conflitos.map((c, i) => <li key={i}>{c.texto}</li>)}
          </ul>
        </div>
      )}

      {grupos.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <Users className="size-4" aria-hidden /> Ninguém escalado ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {grupos.map((g) => (
            <li key={g.funcao}>
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.funcao}</p>
              <ul className="flex flex-wrap gap-2">
                {g.itens.map((e) => (
                  <li
                    key={e.id}
                    className={`flex min-h-10 items-center gap-1 rounded-full border pl-3 text-sm font-medium ${conflitantes.has(e.membroId) ? "border-amber-400 bg-amber-50" : "bg-background"}`}
                  >
                    {e.membro}
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() =>
                        iniciar(async () => {
                          const r = await removerEscala(e.id, eventoId);
                          if (!r.ok) toast.error(r.erro);
                        })
                      }
                      className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`Tirar ${e.membro} de ${e.funcao}`}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-lg bg-muted/60 p-3">
        <p className="text-sm font-medium">Escalar alguém</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label htmlFor="esc-funcao" className="sr-only">Função</Label>
            <select id="esc-funcao" value={funcaoId} onChange={(e) => setFuncaoId(e.target.value)} className={selectCls}>
              <option value="">Função…</option>
              {funcoes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="esc-membro" className="sr-only">Pessoa</Label>
            <select id="esc-membro" value={membroId} onChange={(e) => setMembroId(e.target.value)} className={selectCls}>
              <option value="">Pessoa…</option>
              {membrosOrdenados.sugeridos.length > 0 && (
                <optgroup label="Tocam/cantam essa função">
                  {membrosOrdenados.sugeridos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </optgroup>
              )}
              <optgroup label={membrosOrdenados.sugeridos.length ? "Outros membros" : "Membros"}>
                {membrosOrdenados.outros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </optgroup>
            </select>
          </div>
          <Button type="button" onClick={adicionar} disabled={pendente}>
            <Plus /> Escalar
          </Button>
        </div>
        {anteriores.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <select aria-label="Copiar escala de" value={origem} onChange={(e) => setOrigem(e.target.value)} className={`${selectCls} flex-1`}>
              <option value="">Copiar escala de outro evento…</option>
              {anteriores.map((a) => <option key={a.id} value={a.id}>{a.rotulo}</option>)}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={!origem || pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await copiarEscala(eventoId, origem);
                  if (!r.ok) return void toast.error(r.erro);
                  toast.success(`${r.dados.copiados} escalação(ões) copiada(s).`);
                  setOrigem("");
                })
              }
            >
              <Copy /> Copiar
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
