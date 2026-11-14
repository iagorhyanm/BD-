"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, CalendarDays, FileMusic, GripVertical, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { semReset } from "@/lib/form";
import { rotuloMomento } from "@/lib/dominio";
import { excluirSetlist, salvarItensSetlist, salvarSetlist } from "@/server/actions/repertorio";
import { cn } from "@/lib/utils";

type Musica = { id: string; titulo: string; artista: string | null; tom: string | null; momentos: string[]; cifra_url: string | null };
type Item = { chave: string; musica_id: string; tom: string; observacao: string };

let n = 0;
const novaChave = () => `n${Date.now()}${n++}`;
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function EditorSetlist({
  setlist,
  itensIniciais,
  musicas,
  eventos,
}: {
  setlist: { id: string; titulo: string; observacoes: string | null; eventoId: string | null };
  itensIniciais: Item[];
  musicas: Musica[];
  eventos: { id: string; rotulo: string }[];
}) {
  const router = useRouter();
  const [itens, setItens] = useState(itensIniciais);
  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroInfo, setErroInfo] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const dndId = useId();
  const porId = useMemo(() => Object.fromEntries(musicas.map((m) => [m.id, m])), [musicas]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!sujo) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sujo]);

  const mudar = (fn: (i: Item[]) => Item[]) => {
    setItens(fn);
    setSujo(true);
  };

  function aoSoltar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    mudar((is) => arrayMove(is, is.findIndex((x) => x.chave === e.active.id), is.findIndex((x) => x.chave === e.over!.id)));
  }

  function salvarItens() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarItensSetlist(
        setlist.id,
        itens.map((i) => ({ musica_id: i.musica_id, tom: i.tom || null, observacao: i.observacao || null })),
      );
      if (!r.ok) return setErro(r.erro);
      setSujo(false);
      toast.success("Setlist salva!");
    });
  }

  function salvarInfo(fd: FormData) {
    setErroInfo(null);
    iniciar(async () => {
      const r = await salvarSetlist(setlist.id, fd);
      if (!r.ok) return setErroInfo(r.erro);
      toast.success("Dados salvos!");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 pb-28 lg:grid-cols-[1fr_20rem] [&>*]:min-w-0">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Músicas ({itens.length})</h2>
          <Button onClick={() => setBuscando(true)} variant="outline">
            <Plus /> Adicionar música
          </Button>
        </div>
        {itens.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">
            Nenhuma música. Use “Adicionar música”.
          </p>
        ) : (
          <DndContext id={dndId} sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
            <SortableContext items={itens.map((i) => i.chave)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2">
                {itens.map((i, idx) => (
                  <ItemSetlist
                    key={i.chave}
                    item={i}
                    musica={porId[i.musica_id]}
                    indice={idx}
                    total={itens.length}
                    aoMudar={(c) => mudar((is) => is.map((x) => (x.chave === i.chave ? { ...x, ...c } : x)))}
                    aoRemover={() => mudar((is) => is.filter((x) => x.chave !== i.chave))}
                    aoMover={(d) => mudar((is) => arrayMove(is, idx, idx + d))}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
        <AlertaErro mensagem={erro} />
      </section>

      <aside className="space-y-4">
        <form onSubmit={semReset(salvarInfo)} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="sl-titulo">Título</Label>
            <Input id="sl-titulo" name="titulo" defaultValue={setlist.titulo} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sl-evento">Evento</Label>
            <select id="sl-evento" name="evento_id" defaultValue={setlist.eventoId ?? ""} className="h-11 w-full rounded-lg border border-input bg-background px-3 md:h-10">
              <option value="">Sem evento (modelo)</option>
              {eventos.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}
            </select>
            {setlist.eventoId && (
              <Link href={`/agenda/${setlist.eventoId}`} className="inline-flex items-center gap-1 text-sm text-primary underline">
                <CalendarDays className="size-4" aria-hidden /> Abrir evento
              </Link>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sl-obs">Observações</Label>
            <Textarea id="sl-obs" name="observacoes" rows={3} defaultValue={setlist.observacoes ?? ""} />
          </div>
          <AlertaErro mensagem={erroInfo} />
          <Button type="submit" variant="outline" className="w-full" disabled={pendente}>
            Salvar dados
          </Button>
        </form>
        <Confirmar
          gatilho={
            <Button variant="ghost" className="w-full text-destructive">
              <Trash2 /> Excluir setlist
            </Button>
          }
          titulo="Excluir esta setlist?"
          descricao="As músicas continuam na biblioteca."
          rotuloConfirmar="Excluir"
          destrutivo
          aoConfirmar={async () => {
            const r = await excluirSetlist(setlist.id);
            if (!r.ok) return toast.error(r.erro);
            toast.success("Setlist excluída.");
            router.push("/repertorio?aba=setlists");
          }}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 p-3 backdrop-blur transition-transform lg:bottom-0 lg:left-64",
          sujo ? "translate-y-0" : "pointer-events-none translate-y-[200%]",
        )}
        aria-hidden={!sujo}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 lg:px-8">
          <p className="flex-1 text-sm font-medium">Alterações não salvas</p>
          <Button onClick={salvarItens} disabled={pendente} tabIndex={sujo ? 0 : -1}>
            <Save /> {pendente ? "Salvando…" : "Salvar setlist"}
          </Button>
        </div>
      </div>

      <BuscarMusica
        aberto={buscando}
        aoFechar={() => setBuscando(false)}
        musicas={musicas}
        jaNaLista={new Set(itens.map((i) => i.musica_id))}
        aoEscolher={(m) => {
          mudar((is) => [...is, { chave: novaChave(), musica_id: m.id, tom: m.tom ?? "", observacao: "" }]);
          toast.success(`“${m.titulo}” adicionada.`);
        }}
      />
    </div>
  );
}

function ItemSetlist({
  item,
  musica,
  indice,
  total,
  aoMudar,
  aoRemover,
  aoMover,
}: {
  item: Item;
  musica: Musica | undefined;
  indice: number;
  total: number;
  aoMudar: (c: Partial<Item>) => void;
  aoRemover: () => void;
  aoMover: (d: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.chave });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-xl border bg-card p-2", isDragging && "relative z-10 shadow-lg ring-2 ring-primary/30")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        aria-label={`Arrastar ${musica?.titulo ?? "música"}`}
      >
        <GripVertical className="size-5" />
      </button>
      <span className="w-5 text-right text-sm font-semibold text-muted-foreground">{indice + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{musica?.titulo ?? "Música removida"}</p>
        <p className="truncate text-xs text-muted-foreground">{musica?.artista}</p>
      </div>
      <Input
        value={item.tom}
        onChange={(e) => aoMudar({ tom: e.target.value })}
        className="w-16 text-center font-mono"
        aria-label={`Tom de ${musica?.titulo}`}
        placeholder="Tom"
        maxLength={10}
      />
      {musica?.cifra_url && (
        <Button asChild variant="ghost" size="icon-sm" className="hidden sm:inline-flex">
          <a href={musica.cifra_url} target="_blank" rel="noopener noreferrer" aria-label={`Cifra de ${musica.titulo}`}><FileMusic /></a>
        </Button>
      )}
      <div className="flex flex-col sm:flex-row">
        <Button type="button" variant="ghost" size="icon-sm" disabled={indice === 0} onClick={() => aoMover(-1)} aria-label="Mover para cima"><ArrowUp /></Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={indice === total - 1} onClick={() => aoMover(1)} aria-label="Mover para baixo"><ArrowDown /></Button>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={aoRemover} aria-label={`Tirar ${musica?.titulo} da setlist`} className="text-destructive">
        <X />
      </Button>
    </li>
  );
}

function BuscarMusica({
  aberto,
  aoFechar,
  musicas,
  jaNaLista,
  aoEscolher,
}: {
  aberto: boolean;
  aoFechar: () => void;
  musicas: Musica[];
  jaNaLista: Set<string>;
  aoEscolher: (m: Musica) => void;
}) {
  const [busca, setBusca] = useState("");
  const filtradas = useMemo(() => {
    const b = normalizar(busca.trim());
    return musicas.filter((m) => !b || normalizar(`${m.titulo} ${m.artista ?? ""} ${m.momentos.join(" ")}`).includes(b)).slice(0, 80);
  }, [musicas, busca]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="flex max-h-[85dvh] flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar música</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input autoFocus type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar na biblioteca" aria-label="Buscar música" className="pl-9" />
        </div>
        {musicas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            A biblioteca está vazia. <Link href="/repertorio" className="text-primary underline">Cadastre músicas</Link>.
          </p>
        ) : (
          <ul className="-mx-2 flex-1 overflow-y-auto">
            {filtradas.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => aoEscolher(m)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[m.artista, ...m.momentos.map(rotuloMomento)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {m.tom && <span className="font-mono text-sm">{m.tom}</span>}
                  {jaNaLista.has(m.id) ? (
                    <span className="text-xs text-muted-foreground">na lista</span>
                  ) : (
                    <Plus className="size-4 text-primary" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
