"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, KeyRound, MoreVertical, Pencil, Trophy, Search, ShieldCheck, ShieldMinus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarNome } from "@/components/avatar-nome";
import { formatarData } from "@/lib/datas";
import { alterarAtivo, alterarPapel, editarUsuario, redefinirSenha, type Credenciais } from "@/server/actions/usuarios";
import { adicionarAoDesafio } from "@/server/actions/admin-desafios";
import { Label } from "@/components/ui/label";
import { AlertaErro } from "@/components/alerta-erro";
import { semReset } from "@/lib/form";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type U = { id: string; nome: string; foto: string | null; email: string; papel: "admin" | "usuario"; ativo: boolean; precisaTrocar: boolean; criadoEm: string; leituras: number; grupos: string[] };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ListaUsuarios({ usuarios, meuId, grupos }: { usuarios: U[]; meuId: string; grupos: { id: string; nome: string }[] }) {
  const [busca, setBusca] = useState("");
  const [cred, setCred] = useState<Credenciais | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState<U | null>(null);
  const [paraDesafio, setParaDesafio] = useState<U | null>(null);
  const [grupoEscolhido, setGrupoEscolhido] = useState("");
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const lista = useMemo(() => usuarios.filter((u) => norm(`${u.nome} ${u.email}`).includes(norm(busca.trim()))), [usuarios, busca]);

  const exec = (fn: () => Promise<{ ok: boolean; erro?: string }>, msg: string) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.erro ?? "Erro");
      else toast.success(msg);
    });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou e-mail" aria-label="Buscar" className="pl-9" />
      </div>
      <ul className="space-y-2">
        {lista.map((u) => (
          <li key={u.id} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", !u.ativo && "opacity-60")}>
            <AvatarNome nome={u.nome} id={u.id} foto={u.foto} tamanho="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {u.nome}
                {u.id === meuId && <span className="font-normal text-muted-foreground"> (você)</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {u.papel === "admin" && <Badge>Admin</Badge>}
                {!u.ativo && <Badge variant="destructive">Desativado</Badge>}
                {u.precisaTrocar && <Badge variant="outline">Senha provisória</Badge>}
                {u.ativo && u.grupos.length === 0 && <Badge variant="secondary">Sem desafio</Badge>}
                <span className="text-muted-foreground">
                  {u.leituras} {u.leituras === 1 ? "leitura" : "leituras"}
                  {u.grupos.length > 0 && ` · ${u.grupos.length} ${u.grupos.length === 1 ? "desafio" : "desafios"}`} · desde {formatarData(u.criadoEm, "dd/MM/yy")}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Ações para ${u.nome}`} disabled={pendente}>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem
                  className="min-h-11"
                  onSelect={() => {
                    setErroEdicao(null);
                    setEditando(u);
                  }}
                >
                  <Pencil /> Editar nome e e-mail
                </DropdownMenuItem>
                {u.ativo && (
                  <DropdownMenuItem
                    className="min-h-11"
                    onSelect={() => {
                      setGrupoEscolhido("");
                      setParaDesafio(u);
                    }}
                  >
                    <Trophy /> Adicionar a um desafio
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="min-h-11"
                  onSelect={() =>
                    iniciar(async () => {
                      const r = await redefinirSenha(u.id);
                      if (!r.ok) return void toast.error(r.erro);
                      setCred(r.dados);
                    })
                  }
                >
                  <KeyRound /> Redefinir senha
                </DropdownMenuItem>
                {u.id !== meuId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="min-h-11"
                      onSelect={() => exec(() => alterarPapel(u.id, u.papel === "admin" ? "usuario" : "admin"), "Papel atualizado.")}
                    >
                      {u.papel === "admin" ? <ShieldMinus /> : <ShieldCheck />} {u.papel === "admin" ? "Tirar de administrador" : "Tornar administrador"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="min-h-11"
                      variant={u.ativo ? "destructive" : "default"}
                      onSelect={() => {
                        if (!u.ativo || window.confirm(`Desativar a conta de ${u.nome}? A pessoa perde o acesso na hora.`))
                          exec(() => alterarAtivo(u.id, !u.ativo), u.ativo ? "Conta desativada." : "Conta reativada.");
                      }}
                    >
                      {u.ativo ? <UserX /> : <UserCheck />} {u.ativo ? "Desativar conta" : "Reativar conta"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <Dialog open={!!paraDesafio} onOpenChange={(v) => !v && setParaDesafio(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar a um desafio</DialogTitle>
            <DialogDescription>{paraDesafio?.nome} entra na hora, sem precisar de link ou código.</DialogDescription>
          </DialogHeader>
          {paraDesafio && (() => {
            const disponiveis = grupos.filter((g) => !paraDesafio.grupos.includes(g.id));
            if (!grupos.length) return <p className="text-sm text-muted-foreground">Nenhum desafio criado ainda.</p>;
            if (!disponiveis.length) return <p className="text-sm text-muted-foreground">{paraDesafio.nome} já está em todos os desafios. 🎉</p>;
            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-grupo">Desafio</Label>
                  <select
                    id="ad-grupo"
                    value={grupoEscolhido}
                    onChange={(e) => setGrupoEscolhido(e.target.value)}
                    className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                  >
                    <option value="" disabled>
                      Escolha o desafio…
                    </option>
                    {disponiveis.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full"
                  disabled={pendente || !grupoEscolhido}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await adicionarAoDesafio(grupoEscolhido, [paraDesafio.id]);
                      if (!r.ok) return void toast.error(r.erro);
                      toast.success(`${paraDesafio.nome} foi adicionado(a) ao desafio!`);
                      setParaDesafio(null);
                      router.refresh();
                    })
                  }
                >
                  <Trophy /> {pendente ? "Adicionando…" : "Adicionar"}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
            <DialogDescription>A pessoa passa a entrar com o novo e-mail. A senha continua a mesma.</DialogDescription>
          </DialogHeader>
          {editando && (
            <form
              className="space-y-4"
              onSubmit={semReset((fd) => {
                setErroEdicao(null);
                iniciar(async () => {
                  const r = await editarUsuario(editando.id, String(fd.get("nome") ?? ""), String(fd.get("email") ?? ""));
                  if (!r.ok) return setErroEdicao(r.erro);
                  toast.success("Conta atualizada.");
                  setEditando(null);
                  router.refresh();
                });
              })}
            >
              <div className="space-y-2">
                <Label htmlFor="ed-nome">Nome</Label>
                <Input id="ed-nome" name="nome" required minLength={2} maxLength={80} defaultValue={editando.nome} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-email">E-mail</Label>
                <Input id="ed-email" name="email" type="email" required defaultValue={editando.email} autoCapitalize="none" />
              </div>
              <AlertaErro mensagem={erroEdicao} />
              <Button type="submit" className="w-full" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cred} onOpenChange={(v) => !v && setCred(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha redefinida</DialogTitle>
            <DialogDescription>Envie para a pessoa. Ela vai criar uma senha nova no próximo acesso.</DialogDescription>
          </DialogHeader>
          {cred && (
            <dl className="space-y-3 rounded-xl bg-muted p-4">
              <div>
                <dt className="text-sm text-muted-foreground">E-mail</dt>
                <dd className="font-mono font-semibold break-all">{cred.login}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Senha provisória</dt>
                <dd className="font-mono text-lg font-semibold tracking-wider">{cred.senha}</dd>
              </div>
            </dl>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              if (!cred) return;
              await navigator.clipboard.writeText(`${document.title.split(" · ").pop() || "BibleRats"} — ${window.location.origin}/login\nE-mail: ${cred.login}\nSenha provisória: ${cred.senha}`);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
          >
            {copiado ? <Check /> : <Copy />} Copiar mensagem
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
