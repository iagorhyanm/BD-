"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Megaphone, MoreVertical, Pencil, Pin, PinOff, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { EstadoVazio } from "@/components/estado-vazio";
import { AlertaErro } from "@/components/alerta-erro";
import { semReset } from "@/lib/form";
import { formatarDataHora } from "@/lib/datas";
import { alternarFixado, excluirAviso, salvarAviso } from "@/server/actions/avisos";
import { cn } from "@/lib/utils";

type Aviso = { id: string; titulo: string; texto: string; fixado: boolean; criado_em: string; autor: string; envios: number; ultimoEnvio: string | null };

export function MuralAvisos({ avisos }: { avisos: Aviso[] }) {
  const [editando, setEditando] = useState<Aviso | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<Aviso | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditando("novo")}>
        <Plus /> Novo aviso
      </Button>
      {avisos.length === 0 ? (
        <EstadoVazio icone={Megaphone} titulo="Nenhum aviso ainda" descricao="Publique recados para os coordenadores e envie para os membros pelo WhatsApp." />
      ) : (
        <ul className="space-y-3">
          {avisos.map((a) => (
            <li key={a.id} className={cn("rounded-xl border bg-card p-4", a.fixado && "border-destaque bg-destaque/5")}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {a.fixado && (
                    <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground/80">
                      <Pin className="size-3.5" aria-hidden /> Fixado
                    </p>
                  )}
                  <h2 className="text-lg font-semibold">{a.titulo}</h2>
                  <p className="text-xs text-muted-foreground">
                    {a.autor} · {formatarDataHora(a.criado_em, "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Ações do aviso ${a.titulo}`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="min-h-11" onSelect={() => setEditando(a)}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="min-h-11"
                      onSelect={() =>
                        iniciar(async () => {
                          const r = await alternarFixado(a.id, !a.fixado);
                          if (!r.ok) toast.error(r.erro);
                        })
                      }
                    >
                      {a.fixado ? <PinOff /> : <Pin />} {a.fixado ? "Desafixar" : "Fixar no topo"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="min-h-11" variant="destructive" onSelect={() => setExcluindo(a)}>
                      <Trash2 /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-3 whitespace-pre-line">{a.texto}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  {a.envios ? `Enviado ${a.envios}× · último em ${formatarDataHora(a.ultimoEnvio!, "dd/MM HH:mm")}` : "Ainda não enviado aos membros"}
                </p>
                <Button asChild size="sm">
                  <Link href={`/avisos/${a.id}`}>
                    <Send /> Enviar para membros
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && <DialogAviso aviso={editando === "novo" ? null : editando} aoFechar={() => setEditando(null)} />}

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && !pendente && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{excluindo?.titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>O histórico de envios deste aviso também é apagado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendente}
              onClick={(e) => {
                e.preventDefault();
                iniciar(async () => {
                  const r = await excluirAviso(excluindo!.id);
                  if (!r.ok) toast.error(r.erro);
                  else toast.success("Aviso excluído.");
                  setExcluindo(null);
                });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DialogAviso({ aviso, aoFechar }: { aviso: Aviso | null; aoFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [fixado, setFixado] = useState(aviso?.fixado ?? false);
  const [pendente, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    if (fixado) fd.set("fixado", "on");
    iniciar(async () => {
      const r = await salvarAviso(aviso?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(aviso ? "Aviso salvo!" : "Aviso publicado!");
      aoFechar();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aviso ? "Editar aviso" : "Novo aviso"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={semReset(enviar)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="av-titulo">Título</Label>
            <Input id="av-titulo" name="titulo" required defaultValue={aviso?.titulo} placeholder="Ex.: Ensaio geral no sábado" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="av-texto">Mensagem</Label>
            <Textarea id="av-texto" name="texto" rows={6} required defaultValue={aviso?.texto} />
            <p className="text-sm text-muted-foreground">No WhatsApp, *asteriscos* deixam o texto em negrito.</p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
            <span className="font-medium">Fixar no topo do mural</span>
            <Switch checked={fixado} onCheckedChange={setFixado} />
          </label>
          <AlertaErro mensagem={erro} />
          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? "Salvando…" : aviso ? "Salvar" : "Publicar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
