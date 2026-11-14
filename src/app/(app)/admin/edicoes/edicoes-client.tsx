"use client";

import { semReset } from "@/lib/form";
import { useState, useTransition } from "react";
import { CalendarPlus, CalendarRange, Copy, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Edicao } from "@/lib/edicao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ativarEdicao,
  criarEdicao,
  duplicarEdicao,
  editarEdicao,
  excluirEdicao,
} from "@/server/actions/edicoes";

const TEXTO_LGPD_PADRAO =
  "Autorizo a equipe da Bandinha do EJC Marabá a usar os dados informados neste formulário exclusivamente para o processo de seleção e organização da equipe, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Os dados não serão compartilhados com terceiros e poderão ser excluídos a qualquer momento mediante solicitação.";

/* ------------------------------------------------------------------ */

export function NovaEdicao({ textoLgpdPadrao }: { textoLgpdPadrao?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <CalendarPlus /> Nova edição
      </Button>
      {aberto && (
        <FormEdicaoDialog
          titulo="Nova edição"
          inicial={{ texto_lgpd: textoLgpdPadrao ?? TEXTO_LGPD_PADRAO, ano: new Date().getFullYear() + 1 }}
          aoFechar={() => setAberto(false)}
          aoEnviar={async (fd) => {
            const r = await criarEdicao(fd);
            if (r.ok) toast.success("Edição criada!");
            return r;
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

export function ListaEdicoes({ edicoes }: { edicoes: Edicao[] }) {
  const [editando, setEditando] = useState<Edicao | null>(null);
  const [duplicando, setDuplicando] = useState<Edicao | null>(null);
  const [excluindo, setExcluindo] = useState<Edicao | null>(null);
  const [pendente, iniciar] = useTransition();

  if (edicoes.length === 0) {
    return (
      <EstadoVazio
        icone={CalendarRange}
        titulo="Nenhuma edição ainda"
        descricao="Crie a primeira edição para começar a usar o sistema."
      />
    );
  }

  function ativar(e: Edicao) {
    iniciar(async () => {
      const r = await ativarEdicao(e.id);
      if (r.ok) toast.success(`${e.nome} agora é a edição ativa.`);
      else toast.error(r.erro);
    });
  }

  return (
    <>
      <ul className="space-y-3">
        {edicoes.map((e) => (
          <li key={e.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{e.nome}</h2>
                  {e.ativa && <Badge className="bg-destaque text-destaque-foreground">Ativa</Badge>}
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-muted-foreground">Vagas H</dt>
                    <dd className="text-base font-semibold">{e.vagas_masculino}</dd>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-muted-foreground">Vagas M</dt>
                    <dd className="text-base font-semibold">{e.vagas_feminino}</dd>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-muted-foreground">Limite faltas</dt>
                    <dd className="text-base font-semibold">{e.limite_faltas}</dd>
                  </div>
                </dl>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Ações para ${e.nome}`}>
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {!e.ativa && (
                    <DropdownMenuItem className="min-h-11" disabled={pendente} onSelect={() => ativar(e)}>
                      <Star /> Tornar ativa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="min-h-11" onSelect={() => setEditando(e)}>
                    <Pencil /> Editar e configurar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="min-h-11" onSelect={() => setDuplicando(e)}>
                    <Copy /> Duplicar
                  </DropdownMenuItem>
                  {!e.ativa && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="min-h-11" variant="destructive" onSelect={() => setExcluindo(e)}>
                        <Trash2 /> Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
      </ul>

      {editando && (
        <FormEdicaoDialog
          titulo={`Editar ${editando.nome}`}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoEnviar={async (fd) => {
            const r = await editarEdicao(editando.id, fd);
            if (r.ok) toast.success("Edição salva.");
            return r;
          }}
        />
      )}

      {duplicando && <DuplicarDialog origem={duplicando} aoFechar={() => setDuplicando(null)} />}

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && !pendente && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Edições com dados vinculados não podem ser excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendente}
              onClick={(ev) => {
                ev.preventDefault();
                iniciar(async () => {
                  const r = await excluirEdicao(excluindo!.id);
                  if (r.ok) toast.success("Edição excluída.");
                  else toast.error(r.erro);
                  setExcluindo(null);
                });
              }}
            >
              {pendente ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */

type Resultado = { ok: true } | { ok: false; erro: string };

function FormEdicaoDialog({
  titulo,
  inicial,
  aoFechar,
  aoEnviar,
}: {
  titulo: string;
  inicial: Partial<Edicao>;
  aoFechar: () => void;
  aoEnviar: (fd: FormData) => Promise<Resultado>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await aoEnviar(fd);
      if (!r.ok) return setErro(r.erro);
      aoFechar();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={semReset(enviar)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ed-nome">Nome</Label>
              <Input id="ed-nome" name="nome" defaultValue={inicial.nome ?? ""} placeholder="EJC 2027" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-ano">Ano</Label>
              <Input id="ed-ano" name="ano" type="number" inputMode="numeric" defaultValue={inicial.ano ?? ""} />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Vagas na equipe</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ed-vh" className="text-muted-foreground">Homens</Label>
                <Input id="ed-vh" name="vagas_masculino" type="number" min={0} inputMode="numeric" defaultValue={inicial.vagas_masculino ?? 0} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-vm" className="text-muted-foreground">Mulheres</Label>
                <Input id="ed-vm" name="vagas_feminino" type="number" min={0} inputMode="numeric" defaultValue={inicial.vagas_feminino ?? 0} required />
              </div>
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="ed-faltas">Limite de faltas</Label>
            <Input id="ed-faltas" name="limite_faltas" type="number" min={0} inputMode="numeric" defaultValue={inicial.limite_faltas ?? 3} required aria-describedby="ed-faltas-ajuda" />
            <p id="ed-faltas-ajuda" className="text-sm text-muted-foreground">
              Conta só faltas não justificadas. Acima disso, o membro aparece em destaque.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-lgpd">Texto de consentimento LGPD</Label>
            <Textarea id="ed-lgpd" name="texto_lgpd" rows={6} defaultValue={inicial.texto_lgpd ?? TEXTO_LGPD_PADRAO} required aria-describedby="ed-lgpd-ajuda" />
            <p id="ed-lgpd-ajuda" className="text-sm text-muted-foreground">
              Aparece nos formulários de inscrição desta edição.
            </p>
          </div>
          <AlertaErro mensagem={erro} />
          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DuplicarDialog({ origem, aoFechar }: { origem: Edicao; aoFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const proximoAno = (origem.ano ?? new Date().getFullYear()) + 1;

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await duplicarEdicao(origem.id, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success("Edição duplicada!");
      aoFechar();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar {origem.nome}</DialogTitle>
          <DialogDescription>
            Copia vagas, limite de faltas, texto LGPD e, quando esses módulos existirem, os equipamentos.
            Inscrições e membros não são copiados. O repertório já é compartilhado entre as edições.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={semReset(enviar)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="dup-nome">Nome da nova edição</Label>
              <Input id="dup-nome" name="nome" defaultValue={`EJC ${proximoAno}`} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dup-ano">Ano</Label>
              <Input id="dup-ano" name="ano" type="number" inputMode="numeric" defaultValue={proximoAno} />
            </div>
          </div>
          <AlertaErro mensagem={erro} />
          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? "Duplicando…" : "Duplicar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
