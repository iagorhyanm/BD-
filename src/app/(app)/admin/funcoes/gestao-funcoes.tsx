"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertaErro } from "@/components/alerta-erro";
import { semReset } from "@/lib/form";
import { ROTULO_TIPO_FUNCAO, type Funcao, type TipoFuncao } from "@/lib/dominio";
import { alternarFuncao, criarFuncao, editarFuncao, excluirFuncao } from "@/server/actions/funcoes";
import { cn } from "@/lib/utils";

const selectCls = "h-11 rounded-lg border border-input bg-background px-3 md:h-10";

export function GestaoFuncoes({ funcoes }: { funcoes: Funcao[] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="space-y-4">
      <form
        onSubmit={semReset((fd) => {
          setErro(null);
          iniciar(async () => {
            const r = await criarFuncao(fd);
            if (!r.ok) return setErro(r.erro);
            toast.success("Função criada!");
            (document.getElementById("nova-funcao") as HTMLInputElement).value = "";
          });
        })}
        className="flex flex-wrap gap-2 rounded-xl border bg-card p-3"
      >
        <Input id="nova-funcao" name="nome" placeholder="Nova função (ex.: Sanfona)" aria-label="Nome da nova função" className="min-w-40 flex-1" required />
        <select name="tipo" defaultValue="instrumento" aria-label="Tipo" className={selectCls}>
          {(Object.keys(ROTULO_TIPO_FUNCAO) as TipoFuncao[]).map((t) => <option key={t} value={t}>{ROTULO_TIPO_FUNCAO[t]}</option>)}
        </select>
        <Button type="submit" disabled={pendente}><Plus /> Adicionar</Button>
      </form>
      <AlertaErro mensagem={erro} />
      <ul className="divide-y rounded-xl border bg-card">
        {funcoes.map((f) => (
          <li key={f.id} className={cn("flex flex-wrap items-center gap-2 p-3", !f.ativo && "opacity-60")}>
            {editando === f.id ? (
              <form
                className="flex flex-1 flex-wrap gap-2"
                onSubmit={semReset((fd) =>
                  iniciar(async () => {
                    const r = await editarFuncao(f.id, fd);
                    if (!r.ok) return void toast.error(r.erro);
                    setEditando(null);
                  }),
                )}
              >
                <Input name="nome" defaultValue={f.nome} aria-label="Nome" className="min-w-32 flex-1" autoFocus required />
                <select name="tipo" defaultValue={f.tipo} aria-label="Tipo" className={selectCls}>
                  {(Object.keys(ROTULO_TIPO_FUNCAO) as TipoFuncao[]).map((t) => <option key={t} value={t}>{ROTULO_TIPO_FUNCAO[t]}</option>)}
                </select>
                <Button type="submit" size="icon" aria-label="Salvar"><Check /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Cancelar" onClick={() => setEditando(null)}><X /></Button>
              </form>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.nome}</p>
                  <p className="text-xs text-muted-foreground">{ROTULO_TIPO_FUNCAO[f.tipo]}{!f.ativo && " · desativada"}</p>
                </div>
                <Switch
                  checked={f.ativo}
                  aria-label={`${f.nome} ativa`}
                  onCheckedChange={(v) =>
                    iniciar(async () => {
                      const r = await alternarFuncao(f.id, v);
                      if (!r.ok) toast.error(r.erro);
                    })
                  }
                />
                <Button variant="ghost" size="icon" aria-label={`Editar ${f.nome}`} onClick={() => setEditando(f.id)}><Pencil /></Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Excluir ${f.nome}`}
                  onClick={() => {
                    if (!window.confirm(`Excluir a função “${f.nome}”?`)) return;
                    iniciar(async () => {
                      const r = await excluirFuncao(f.id);
                      if (!r.ok) toast.error(r.erro);
                      else toast.success("Função excluída.");
                    });
                  }}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
