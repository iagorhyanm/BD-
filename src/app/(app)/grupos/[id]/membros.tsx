"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MoreVertical, Shield, ShieldOff, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AvatarNome } from "@/components/avatar-nome";
import { Confirmar } from "@/components/confirmar";
import { definirPapelNoGrupo, removerMembro, sairDoGrupo } from "@/server/actions/grupos";

type Linha = { user_id: string; nome: string; foto_path: string | null; papel: "dono" | "admin" | "membro" };
const ROTULO = { dono: "Criador(a)", admin: "Admin", membro: "" };

export function Membros({ grupoId, euId, meuPapel, linhas }: { grupoId: string; euId: string; meuPapel: string; linhas: Linha[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const ordem = { dono: 0, admin: 1, membro: 2 };
  const lista = [...linhas].sort((a, b) => ordem[a.papel] - ordem[b.papel] || a.nome.localeCompare(b.nome, "pt-BR"));

  const exec = (fn: () => Promise<{ ok: boolean; erro?: string }>, msg: string) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.erro ?? "Erro");
      else toast.success(msg);
    });

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-2xl border bg-card">
        {lista.map((m) => {
          const podeGerir = m.user_id !== euId && m.papel !== "dono" && (meuPapel === "dono" || (meuPapel === "admin" && m.papel === "membro"));
          return (
            <li key={m.user_id} className="flex items-center gap-3 p-3">
              <AvatarNome nome={m.nome} id={m.user_id} foto={m.foto_path} tamanho="sm" />
              <p className="min-w-0 flex-1 truncate font-medium">
                {m.nome}
                {m.user_id === euId && <span className="text-muted-foreground"> (você)</span>}
              </p>
              {ROTULO[m.papel] && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{ROTULO[m.papel]}</span>}
              {podeGerir && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Ações para ${m.nome}`} disabled={pendente}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {meuPapel === "dono" && (
                      <DropdownMenuItem
                        className="min-h-11"
                        onSelect={() =>
                          exec(
                            () => definirPapelNoGrupo(grupoId, m.user_id, m.papel === "admin" ? "membro" : "admin"),
                            "Papel atualizado.",
                          )
                        }
                      >
                        {m.papel === "admin" ? <ShieldOff /> : <Shield />} {m.papel === "admin" ? "Tirar de admin" : "Tornar admin"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="min-h-11"
                      variant="destructive"
                      onSelect={() => {
                        if (window.confirm(`Remover ${m.nome} do desafio?`)) exec(() => removerMembro(grupoId, m.user_id), "Pessoa removida.");
                      }}
                    >
                      <UserMinus /> Remover do desafio
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>
      {meuPapel !== "dono" && (
        <Confirmar
          gatilho={
            <Button variant="ghost" className="w-full text-destructive">
              <LogOut /> Sair do desafio
            </Button>
          }
          titulo="Sair deste desafio?"
          descricao="Você some do placar. Dá para voltar depois com o código de convite."
          rotuloConfirmar="Sair"
          destrutivo
          aoConfirmar={async () => {
            const r = await sairDoGrupo(grupoId);
            if (!r.ok) return toast.error(r.erro);
            toast.success("Você saiu do desafio.");
            router.push("/grupos");
          }}
        />
      )}
    </div>
  );
}
