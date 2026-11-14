"use client";

import { semReset } from "@/lib/form";
import { useState, useTransition } from "react";
import {
  KeyRound,
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  ShieldCheck,
  ShieldMinus,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { Perfil } from "@/lib/auth";
import { mascararTelefone, linkLigar, linkWhatsApp } from "@/lib/telefone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputTelefone } from "@/components/input-telefone";
import { AlertaErro } from "@/components/alerta-erro";
import { EstadoVazio } from "@/components/estado-vazio";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  alterarAtivo,
  alterarPapel,
  editarCoordenador,
  redefinirSenha,
  type Credenciais,
} from "@/server/actions/coordenadores";
import { CredenciaisDialog } from "./credenciais-dialog";

type Confirmacao = {
  titulo: string;
  descricao: string;
  rotulo: string;
  destrutivo?: boolean;
  executar: () => Promise<void>;
};

export function ListaCoordenadores({ perfis, meuId }: { perfis: Perfil[]; meuId: string }) {
  const [editando, setEditando] = useState<Perfil | null>(null);
  const [credenciais, setCredenciais] = useState<Credenciais | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [pendente, iniciar] = useTransition();

  if (perfis.length === 0) {
    return <EstadoVazio icone={Users} titulo="Nenhum coordenador ainda" descricao="Crie o primeiro login no botão acima." />;
  }

  function confirmarEExecutar() {
    if (!confirmacao) return;
    iniciar(async () => {
      await confirmacao.executar();
      setConfirmacao(null);
    });
  }

  function pedirRedefinicao(p: Perfil) {
    setConfirmacao({
      titulo: `Redefinir a senha de ${p.nome}?`,
      descricao: "A senha atual deixa de funcionar e uma nova senha provisória será gerada.",
      rotulo: "Redefinir senha",
      executar: async () => {
        const r = await redefinirSenha(p.id);
        if (!r.ok) return void toast.error(r.erro);
        setCredenciais(r.dados);
      },
    });
  }

  function pedirAtivo(p: Perfil) {
    const ativar = !p.ativo;
    setConfirmacao({
      titulo: ativar ? `Reativar ${p.nome}?` : `Desativar ${p.nome}?`,
      descricao: ativar
        ? "A pessoa volta a conseguir entrar com a senha que já tinha."
        : "A pessoa perde o acesso imediatamente. Os dados registrados por ela são mantidos.",
      rotulo: ativar ? "Reativar" : "Desativar",
      destrutivo: !ativar,
      executar: async () => {
        const r = await alterarAtivo(p.id, ativar);
        if (!r.ok) toast.error(r.erro);
        else toast.success(ativar ? "Acesso reativado." : "Acesso desativado.");
      },
    });
  }

  function pedirPapel(p: Perfil) {
    const promover = p.papel !== "edg";
    setConfirmacao({
      titulo: promover ? `Promover ${p.nome} a EDG?` : `Tornar ${p.nome} coordenador(a)?`,
      descricao: promover
        ? "Como EDG, a pessoa poderá gerenciar logins, edições e configurações."
        : "A pessoa perde o acesso à Administração.",
      rotulo: promover ? "Promover a EDG" : "Confirmar",
      executar: async () => {
        const r = await alterarPapel(p.id, promover ? "edg" : "coordenador");
        if (!r.ok) toast.error(r.erro);
        else toast.success("Papel atualizado.");
      },
    });
  }

  return (
    <>
      <ul className="space-y-2">
        {perfis.map((p) => {
          const souEu = p.id === meuId;
          const whats = linkWhatsApp(p.telefone);
          const ligar = linkLigar(p.telefone);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 ${p.ativo ? "" : "opacity-70"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{p.nome}</p>
                  {souEu && <span className="text-sm text-muted-foreground">(você)</span>}
                </div>
                <p className="truncate font-mono text-sm text-muted-foreground">{p.usuario ?? p.email}</p>
                {p.telefone && <p className="text-sm text-muted-foreground">{mascararTelefone(p.telefone)}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant={p.papel === "edg" ? "default" : "secondary"}>
                    {p.papel === "edg" ? "EDG" : "Coordenador(a)"}
                  </Badge>
                  {!p.ativo && <Badge variant="destructive">Desativado</Badge>}
                  {p.ativo && p.precisa_trocar_senha && (
                    <Badge variant="outline" className="border-destaque text-foreground">
                      Aguardando 1º acesso
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {whats && (
                  <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
                    <a href={whats} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${p.nome}`}>
                      <MessageCircle />
                    </a>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Ações para ${p.nome}`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    {whats && (
                      <DropdownMenuItem asChild className="min-h-11 sm:hidden">
                        <a href={whats} target="_blank" rel="noopener noreferrer">
                          <MessageCircle /> WhatsApp
                        </a>
                      </DropdownMenuItem>
                    )}
                    {ligar && (
                      <DropdownMenuItem asChild className="min-h-11 sm:hidden">
                        <a href={ligar}>
                          <Phone /> Ligar
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="min-h-11" onSelect={() => setEditando(p)}>
                      <Pencil /> Editar dados
                    </DropdownMenuItem>
                    <DropdownMenuItem className="min-h-11" onSelect={() => pedirRedefinicao(p)}>
                      <KeyRound /> Redefinir senha
                    </DropdownMenuItem>
                    {!souEu && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="min-h-11" onSelect={() => pedirPapel(p)}>
                          {p.papel === "edg" ? <ShieldMinus /> : <ShieldCheck />}
                          {p.papel === "edg" ? "Tornar coordenador(a)" : "Promover a EDG"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="min-h-11"
                          variant={p.ativo ? "destructive" : "default"}
                          onSelect={() => pedirAtivo(p)}
                        >
                          {p.ativo ? <UserX /> : <UserCheck />}
                          {p.ativo ? "Desativar acesso" : "Reativar acesso"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>

      <EditarDialog perfil={editando} aoFechar={() => setEditando(null)} />
      <CredenciaisDialog
        credenciais={credenciais}
        aoFechar={() => setCredenciais(null)}
        titulo="Senha redefinida!"
      />

      <AlertDialog open={!!confirmacao} onOpenChange={(v) => !v && !pendente && setConfirmacao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmacao?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{confirmacao?.descricao}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmacao?.destrutivo ? "destructive" : "default"}
              disabled={pendente}
              onClick={(e) => {
                e.preventDefault();
                confirmarEExecutar();
              }}
            >
              {pendente ? "Aguarde…" : confirmacao?.rotulo}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditarDialog({ perfil, aoFechar }: { perfil: Perfil | null; aoFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  if (!perfil) return null;

  function enviar(formData: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await editarCoordenador(perfil!.id, formData);
      if (!r.ok) return setErro(r.erro);
      toast.success("Dados salvos.");
      aoFechar();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar dados</DialogTitle>
        </DialogHeader>
        <form onSubmit={semReset(enviar)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ed-nome">Nome completo</Label>
            <Input id="ed-nome" name="nome" defaultValue={perfil.nome} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-tel">Telefone/WhatsApp</Label>
            <InputTelefone id="ed-tel" name="telefone" defaultValue={perfil.telefone} />
          </div>
          <p className="text-sm text-muted-foreground">
            Login: <span className="font-mono">{perfil.usuario ?? perfil.email}</span> (não pode ser alterado)
          </p>
          <AlertaErro mensagem={erro} />
          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
