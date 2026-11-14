"use client";

import { useOptimistic, useState, useTransition } from "react";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ROTULO_ESTADO, type EstadoEquipamento } from "@/lib/dominio";
import { adicionarAoChecklist, marcarConferido, removerDoChecklist } from "@/server/actions/equipamentos";
import { cn } from "@/lib/utils";

type Item = { id: string; descricao: string; quantidade: number; conferido: boolean; equipamentoId: string | null; conferidoPor: string | null };
type Equip = { id: string; item: string; quantidade: number; estado: EstadoEquipamento };

export function ChecklistEvento({
  eventoId,
  itens,
  equipamentos,
  destaque,
}: {
  eventoId: string;
  itens: Item[];
  equipamentos: Equip[];
  destaque: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  // Marca na hora (otimista) e confirma com o servidor em seguida.
  const [itensVisiveis, marcarOtimista] = useOptimistic(itens, (atual, m: { id: string; conferido: boolean }) =>
    atual.map((i) => (i.id === m.id ? { ...i, conferido: m.conferido } : i)),
  );
  const [texto, setTexto] = useState("");
  const [abrirInventario, setAbrirInventario] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const conferidos = itensVisiveis.filter((i) => i.conferido).length;
  const jaNoChecklist = new Set(itens.map((i) => i.equipamentoId).filter(Boolean));
  const disponiveis = equipamentos.filter((e) => !jaNoChecklist.has(e.id));

  function adicionarTexto() {
    const d = texto.trim();
    if (!d) return;
    iniciar(async () => {
      const r = await adicionarAoChecklist(eventoId, [{ descricao: d }]);
      if (!r.ok) return void toast.error(r.erro);
      setTexto("");
    });
  }

  function adicionarDoInventario() {
    const lista = disponiveis.filter((e) => marcados.has(e.id)).map((e) => ({ equipamento_id: e.id, descricao: e.item, quantidade: Math.max(1, e.quantidade) }));
    if (!lista.length) return;
    iniciar(async () => {
      const r = await adicionarAoChecklist(eventoId, lista);
      if (!r.ok) return void toast.error(r.erro);
      toast.success(`${lista.length} item(ns) adicionados.`);
      setMarcados(new Set());
      setAbrirInventario(false);
    });
  }

  return (
    <section className={cn("space-y-3 rounded-xl border bg-card p-4", destaque && "border-destaque")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Checklist do que levar</h2>
        {itens.length > 0 && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", conferidos === itens.length ? "bg-emerald-100 text-emerald-900" : "bg-muted")}>
            {conferidos}/{itens.length} conferidos
          </span>
        )}
      </div>
      {itens.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${(100 * conferidos) / itens.length}%` }} />
        </div>
      )}
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {destaque ? "Monte a lista do que precisa ser levado para a apresentação." : "Opcional para ensaios."}
        </p>
      ) : (
        <ul className="divide-y">
          {itensVisiveis.map((i) => (
            <li key={i.id} className="flex items-center gap-2 py-1">
              <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--primary)]"
                  checked={i.conferido}
                  onChange={(e) => {
                    const conferido = e.target.checked;
                    iniciar(async () => {
                      marcarOtimista({ id: i.id, conferido });
                      const r = await marcarConferido(i.id, eventoId, conferido);
                      if (!r.ok) toast.error(r.erro);
                    });
                  }}
                />
                <span className="min-w-0">
                  <span className={cn("block", i.conferido && "text-muted-foreground line-through")}>
                    {i.quantidade > 1 && <span className="font-semibold">{i.quantidade}× </span>}
                    {i.descricao}
                  </span>
                  {i.conferido && i.conferidoPor && <span className="block text-xs text-muted-foreground">por {i.conferidoPor}</span>}
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${i.descricao}`}
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await removerDoChecklist(i.id, eventoId);
                    if (!r.ok) toast.error(r.erro);
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarTexto())}
          placeholder="Ex.: Extensão, pilhas…"
          aria-label="Novo item do checklist"
        />
        <Button type="button" variant="outline" size="icon" onClick={adicionarTexto} disabled={pendente || !texto.trim()} aria-label="Adicionar item">
          <Plus />
        </Button>
      </div>
      {equipamentos.length > 0 && (
        <Button type="button" variant="outline" className="w-full" onClick={() => setAbrirInventario(true)}>
          <PackagePlus /> Adicionar do inventário
        </Button>
      )}

      <Dialog open={abrirInventario} onOpenChange={setAbrirInventario}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar do inventário</DialogTitle>
            <DialogDescription>Marque o que precisa ser levado.</DialogDescription>
          </DialogHeader>
          {disponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todo o inventário já está no checklist.</p>
          ) : (
            <ul className="space-y-1">
              {disponiveis.map((e) => (
                <li key={e.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--primary)]"
                      checked={marcados.has(e.id)}
                      onChange={(ev) =>
                        setMarcados((s) => {
                          const n = new Set(s);
                          if (ev.target.checked) n.add(e.id);
                          else n.delete(e.id);
                          return n;
                        })
                      }
                    />
                    <span className="flex-1">{e.quantidade > 1 ? `${e.quantidade}× ` : ""}{e.item}</span>
                    {e.estado !== "bom" && (
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ROTULO_ESTADO[e.estado].classe)}>
                        {ROTULO_ESTADO[e.estado].rotulo}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button onClick={adicionarDoInventario} disabled={pendente || marcados.size === 0}>
              Adicionar {marcados.size || ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
