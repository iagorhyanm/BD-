"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AvatarNome } from "@/components/avatar-nome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adicionarAoDesafio, removerDoDesafio } from "@/server/actions/admin-desafios";
import { cn } from "@/lib/utils";

type Pessoa = { id: string; nome: string; email: string; foto: string | null };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AdicionarPessoas({ grupoId, pessoas }: { grupoId: string; pessoas: Pessoa[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();
  const lista = useMemo(() => pessoas.filter((p) => norm(`${p.nome} ${p.email}`).includes(norm(busca.trim()))), [pessoas, busca]);
  const todosVisiveis = lista.length > 0 && lista.every((p) => marcados.has(p.id));

  function alternar(id: string) {
    setMarcados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <UserPlus className="size-5 text-primary" aria-hidden /> Adicionar pessoas
      </h2>
      {pessoas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todas as contas ativas já estão neste desafio. 🎉</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Quem você marcar entra na hora, sem precisar de link ou código, e recebe um aviso.</p>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou e-mail" aria-label="Buscar pessoa" className="pl-9" />
          </div>
          {lista.length > 1 && (
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={() =>
                setMarcados((s) => {
                  const n = new Set(s);
                  for (const p of lista) {
                    if (todosVisiveis) n.delete(p.id);
                    else n.add(p.id);
                  }
                  return n;
                })
              }
            >
              {todosVisiveis ? "Desmarcar todos" : `Marcar todos (${lista.length})`}
            </button>
          )}
          <ul className="max-h-96 divide-y overflow-y-auto rounded-xl border">
            {lista.map((p) => (
              <li key={p.id}>
                <label className={cn("flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2", marcados.has(p.id) && "bg-primary/5")}>
                  <input type="checkbox" checked={marcados.has(p.id)} onChange={() => alternar(p.id)} className="size-5 accent-primary" aria-label={`Adicionar ${p.nome}`} />
                  <AvatarNome nome={p.nome} id={p.id} foto={p.foto} tamanho="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
                  </span>
                </label>
              </li>
            ))}
            {lista.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Ninguém encontrado.</li>}
          </ul>
          <Button
            className="w-full"
            disabled={pendente || marcados.size === 0}
            onClick={() =>
              iniciar(async () => {
                const r = await adicionarAoDesafio(grupoId, [...marcados]);
                if (!r.ok) return void toast.error(r.erro);
                toast.success(r.dados.adicionados === 1 ? "1 pessoa adicionada ao desafio!" : `${r.dados.adicionados} pessoas adicionadas ao desafio!`);
                setMarcados(new Set());
                setBusca("");
                router.refresh();
              })
            }
          >
            <UserPlus /> {pendente ? "Adicionando…" : marcados.size ? `Adicionar ${marcados.size} ${marcados.size === 1 ? "pessoa" : "pessoas"}` : "Marque quem vai entrar"}
          </Button>
        </>
      )}
    </section>
  );
}

const ROTULO = { dono: "Dono", admin: "Admin do desafio", membro: "" } as const;

export function MembrosAdmin({ grupoId, membros }: { grupoId: string; membros: (Pessoa & { papel: "dono" | "admin" | "membro" })[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Participantes ({membros.length})</h2>
      <ul className="divide-y">
        {membros.map((m) => (
          <li key={m.id} className="flex min-h-14 items-center gap-3 py-2">
            <AvatarNome nome={m.nome} id={m.id} foto={m.foto} tamanho="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{m.nome}</span>
              <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
            </span>
            {m.papel !== "membro" && <Badge variant="outline">{ROTULO[m.papel]}</Badge>}
            {m.papel !== "dono" && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover ${m.nome} do desafio`}
                disabled={pendente}
                onClick={() => {
                  if (!window.confirm(`Remover ${m.nome} deste desafio?`)) return;
                  iniciar(async () => {
                    const r = await removerDoDesafio(grupoId, m.id);
                    if (!r.ok) return void toast.error(r.erro);
                    toast.success("Pessoa removida do desafio.");
                    router.refresh();
                  });
                }}
              >
                <UserMinus />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
