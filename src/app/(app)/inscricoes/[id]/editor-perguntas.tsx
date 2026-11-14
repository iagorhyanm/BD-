"use client";

import { useEffect, useId, useState, useTransition } from "react";
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
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Lock, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertaErro } from "@/components/alerta-erro";
import { TIPOS_PERGUNTA, rotuloTipo, tipoTemOpcoes, type Pergunta, type TipoPergunta } from "@/lib/inscricao";
import { salvarPerguntas } from "@/server/actions/formularios";
import { cn } from "@/lib/utils";

const CAMPOS_FIXOS = [
  "Nome completo",
  "Data de nascimento (idade calculada)",
  "Telefone/WhatsApp",
  "Sexo",
  "Já trabalhou no EJC? (equipe e ano)",
  "Cidade",
  "Consentimento LGPD (+ responsável se menor de 18)",
];

let contador = 0;
const novoId = () => `novo-${Date.now()}-${contador++}`;

export function EditorPerguntas({
  formularioId,
  iniciais,
  temInscricoes,
}: {
  formularioId: string;
  iniciais: Pergunta[];
  temInscricoes: boolean;
}) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>(iniciais);
  const [sujo, setSujo] = useState(false);
  const [recemAdicionada, setRecemAdicionada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const dndId = useId();

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    if (!sujo) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sujo]);

  function mudar(fn: (atual: Pergunta[]) => Pergunta[]) {
    setPerguntas(fn);
    setSujo(true);
    setErro(null);
  }

  const atualizar = (id: string, campos: Partial<Pergunta>) =>
    mudar((ps) => ps.map((p) => (p.id === id ? { ...p, ...campos } : p)));

  function adicionar(tipo: TipoPergunta) {
    const nova: Pergunta = {
      id: novoId(),
      tipo,
      rotulo: "",
      ajuda: null,
      opcoes: tipoTemOpcoes(tipo) ? ["Opção 1", "Opção 2"] : [],
      obrigatoria: false,
    };
    mudar((ps) => [...ps, nova]);
    setRecemAdicionada(nova.id);
  }

  function remover(p: Pergunta) {
    if (temInscricoes && !p.id.startsWith("novo-")) {
      const ok = window.confirm(
        `Remover “${p.rotulo || "pergunta"}”? As respostas já recebidas para ela deixam de aparecer.`,
      );
      if (!ok) return;
    }
    mudar((ps) => ps.filter((x) => x.id !== p.id));
  }

  function mover(idx: number, delta: number) {
    mudar((ps) => arrayMove(ps, idx, idx + delta));
  }

  function aoSoltar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    mudar((ps) => {
      const de = ps.findIndex((p) => p.id === e.active.id);
      const para = ps.findIndex((p) => p.id === e.over!.id);
      return arrayMove(ps, de, para);
    });
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarPerguntas(formularioId, perguntas);
      if (!r.ok) return setErro(r.erro);
      setSujo(false);
      toast.success("Perguntas salvas!");
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-xl border bg-muted/50 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Lock className="size-4" aria-hidden /> Campos fixos (sempre aparecem)
        </h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {CAMPOS_FIXOS.map((c) => (
            <li key={c} className="rounded-full border bg-card px-3 py-1 text-sm">
              {c}
            </li>
          ))}
        </ul>
      </section>

      <h2 className="pt-2 text-lg font-semibold">Perguntas personalizadas</h2>
      {perguntas.length === 0 && (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">
          Nenhuma pergunta extra ainda. Adicione abaixo (ex.: “Qual instrumento você toca?”).
        </p>
      )}

      <DndContext id={dndId} sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <SortableContext items={perguntas.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-3">
            {perguntas.map((p, idx) => (
              <ItemPergunta
                key={p.id}
                pergunta={p}
                indice={idx}
                total={perguntas.length}
                focarAoMontar={p.id === recemAdicionada}
                aoMudar={(c) => atualizar(p.id, c)}
                aoRemover={() => remover(p)}
                aoMover={(d) => mover(idx, d)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <div>
        <Label htmlFor="add-tipo" className="mb-2 block">
          Adicionar pergunta
        </Label>
        <Select onValueChange={(v) => adicionar(v as TipoPergunta)} value="">
          <SelectTrigger id="add-tipo" className="w-full sm:w-80">
            <Plus className="size-4" /> <SelectValue placeholder="Escolha o tipo de pergunta…" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_PERGUNTA.map((t) => (
              <SelectItem key={t.valor} value={t.valor}>
                {t.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AlertaErro mensagem={erro} />

      {/* Barra de salvar fixa (acima da navegação inferior no celular) */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 p-3 backdrop-blur transition-transform lg:bottom-0 lg:left-64",
          sujo ? "translate-y-0" : "pointer-events-none translate-y-[200%]",
        )}
        aria-hidden={!sujo}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 lg:px-8">
          <p className="flex-1 text-sm font-medium">Alterações não salvas</p>
          <Button onClick={salvar} disabled={pendente} tabIndex={sujo ? 0 : -1}>
            <Save /> {pendente ? "Salvando…" : "Salvar perguntas"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ItemPergunta({
  pergunta: p,
  indice,
  total,
  aoMudar,
  aoRemover,
  aoMover,
  focarAoMontar,
}: {
  pergunta: Pergunta;
  indice: number;
  total: number;
  focarAoMontar: boolean;
  aoMudar: (c: Partial<Pergunta>) => void;
  aoRemover: () => void;
  aoMover: (delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  });
  const comOpcoes = tipoTemOpcoes(p.tipo);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-xl border bg-card p-3 sm:p-4", isDragging && "relative z-10 shadow-lg ring-2 ring-primary/30")}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Arrastar pergunta ${indice + 1}`}
        >
          <GripVertical className="size-5" />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {indice + 1}. {rotuloTipo(p.tipo)}
            </span>
            <div className="flex">
              <Button type="button" variant="ghost" size="icon-sm" disabled={indice === 0} onClick={() => aoMover(-1)} aria-label="Mover para cima">
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" disabled={indice === total - 1} onClick={() => aoMover(1)} aria-label="Mover para baixo">
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={aoRemover} aria-label="Remover pergunta" className="text-destructive">
                <Trash2 />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`rotulo-${p.id}`}>Pergunta</Label>
            <Input
              id={`rotulo-${p.id}`}
              autoFocus={focarAoMontar}
              value={p.rotulo}
              onChange={(e) => aoMudar({ rotulo: e.target.value })}
              placeholder="Ex.: Qual instrumento você toca?"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`tipo-${p.id}`}>Tipo</Label>
              <Select
                value={p.tipo}
                onValueChange={(v) => {
                  const tipo = v as TipoPergunta;
                  aoMudar({
                    tipo,
                    opcoes: tipoTemOpcoes(tipo) ? (p.opcoes.length ? p.opcoes : ["Opção 1", "Opção 2"]) : [],
                  });
                }}
              >
                <SelectTrigger id={`tipo-${p.id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PERGUNTA.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ajuda-${p.id}`}>Texto de ajuda (opcional)</Label>
              <Input
                id={`ajuda-${p.id}`}
                value={p.ajuda ?? ""}
                onChange={(e) => aoMudar({ ajuda: e.target.value })}
                placeholder={p.tipo === "escala" ? "Ex.: 1 = pouco, 5 = muito" : "Uma dica para quem responde"}
              />
            </div>
          </div>

          {comOpcoes && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Opções</legend>
              {p.opcoes.map((op, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={op}
                    aria-label={`Opção ${i + 1}`}
                    onChange={(e) => aoMudar({ opcoes: p.opcoes.map((o, j) => (j === i ? e.target.value : o)) })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        aoMudar({ opcoes: [...p.opcoes, ""] });
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={p.opcoes.length <= 2}
                    aria-label={`Remover opção ${i + 1}`}
                    onClick={() => aoMudar({ opcoes: p.opcoes.filter((_, j) => j !== i) })}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => aoMudar({ opcoes: [...p.opcoes, `Opção ${p.opcoes.length + 1}`] })}
              >
                <Plus /> Adicionar opção
              </Button>
            </fieldset>
          )}

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t pt-3">
            <span className="text-sm font-medium">Obrigatória</span>
            <Switch checked={p.obrigatoria} onCheckedChange={(v) => aoMudar({ obrigatoria: v })} />
          </label>
        </div>
      </div>
    </li>
  );
}
