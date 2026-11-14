"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Filter,
  MessageCircle,
  Search,
  Star,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import {
  ROTULO_SEXO,
  STATUS,
  classeStatus,
  formatarResposta,
  rotuloStatus,
  type Pergunta,
  type Resposta,
  type Sexo,
  type StatusInscricao,
} from "@/lib/inscricao";
import { linkWhatsApp, mascararTelefone } from "@/lib/telefone";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { baixarCsv, gerarCsv } from "@/lib/csv";
import { slugificar } from "@/lib/inscricao";
import { alterarStatus, puxarParaEquipe } from "@/server/actions/selecao";
import { cn } from "@/lib/utils";

export type InscritoLista = {
  id: string;
  formulario_id: string;
  nome: string;
  idade: number;
  nascimento: string;
  telefone: string;
  sexo: Sexo;
  cidade: string;
  ja_trabalhou: boolean;
  equipe_anterior: string | null;
  ano_anterior: number | null;
  respostas: Record<string, unknown>;
  status: StatusInscricao;
  criado_em: string;
  resp_nome: string | null;
  resp_telefone: string | null;
  media: number | null;
  qtdAvaliacoes: number;
  avalieiEu: boolean;
  naEquipe: boolean;
};

type Form = { id: string; titulo: string; perguntas: Pergunta[] };

type Filtros = {
  busca: string;
  formulario: string;
  status: StatusInscricao[];
  cidade: string;
  idadeMin: string;
  idadeMax: string;
  jaTrabalhou: "" | "sim" | "nao";
  perguntaId: string;
  perguntaValor: string;
};

const FILTROS_VAZIOS: Filtros = {
  busca: "",
  formulario: "",
  status: [],
  cidade: "",
  idadeMin: "",
  idadeMax: "",
  jaTrabalhou: "",
  perguntaId: "",
  perguntaValor: "",
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function atendePergunta(p: Pergunta, v: unknown, alvo: string): boolean {
  if (!alvo) return true;
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.includes(alvo);
  if (p.tipo === "texto_curto" || p.tipo === "texto_longo") return normalizar(String(v)).includes(normalizar(alvo));
  return String(v) === alvo;
}

export function ListaSelecao({
  inscritos,
  formularios,
  vagas,
  nomeEdicao,
  formularioInicial,
  abaInicial,
}: {
  inscritos: InscritoLista[];
  formularios: Form[];
  vagas: Record<Sexo, number>;
  nomeEdicao: string;
  formularioInicial?: string;
  abaInicial: Sexo;
}) {
  const [aba, setAba] = useState<Sexo>(abaInicial);
  const [filtros, setFiltros] = useState<Filtros>({
    ...FILTROS_VAZIOS,
    formulario: formularios.some((f) => f.id === formularioInicial) ? formularioInicial! : "",
  });
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; executar: () => void } | null>(null);

  const perguntas = useMemo(() => {
    const fs = filtros.formulario ? formularios.filter((f) => f.id === filtros.formulario) : formularios;
    return fs.flatMap((f) => f.perguntas.map((p) => ({ ...p, form: f.titulo })));
  }, [formularios, filtros.formulario]);
  const perguntaFiltro = perguntas.find((p) => p.id === filtros.perguntaId);

  const cidades = useMemo(
    () => [...new Set(inscritos.map((i) => i.cidade))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [inscritos],
  );

  const contagem = useMemo(() => {
    const c = { masculino: { total: 0, sel: 0 }, feminino: { total: 0, sel: 0 } };
    for (const i of inscritos) {
      c[i.sexo].total++;
      if (i.status === "selecionado") c[i.sexo].sel++;
    }
    return c;
  }, [inscritos]);

  // Filtra tudo exceto a aba (usado no CSV "filtrado" de ambos os sexos e na lista).
  const filtradosSemAba = useMemo(() => {
    const busca = normalizar(filtros.busca);
    const buscaDigitos = filtros.busca.replace(/\D/g, "");
    const min = filtros.idadeMin ? Number(filtros.idadeMin) : null;
    const max = filtros.idadeMax ? Number(filtros.idadeMax) : null;
    return inscritos.filter((i) => {
      if (filtros.formulario && i.formulario_id !== filtros.formulario) return false;
      if (filtros.status.length && !filtros.status.includes(i.status)) return false;
      if (filtros.cidade && i.cidade !== filtros.cidade) return false;
      if (min !== null && i.idade < min) return false;
      if (max !== null && i.idade > max) return false;
      if (filtros.jaTrabalhou && i.ja_trabalhou !== (filtros.jaTrabalhou === "sim")) return false;
      if (perguntaFiltro && !atendePergunta(perguntaFiltro, i.respostas[perguntaFiltro.id], filtros.perguntaValor))
        return false;
      if (busca) {
        const alvo = normalizar(`${i.nome} ${i.cidade}`);
        if (!alvo.includes(busca) && !(buscaDigitos.length >= 3 && i.telefone.includes(buscaDigitos))) return false;
      }
      return true;
    });
  }, [inscritos, filtros, perguntaFiltro]);

  const visiveis = useMemo(() => filtradosSemAba.filter((i) => i.sexo === aba), [filtradosSemAba, aba]);

  const qtdFiltrosAtivos =
    (filtros.formulario ? 1 : 0) +
    (filtros.status.length ? 1 : 0) +
    (filtros.cidade ? 1 : 0) +
    (filtros.idadeMin || filtros.idadeMax ? 1 : 0) +
    (filtros.jaTrabalhou ? 1 : 0) +
    (filtros.perguntaId && filtros.perguntaValor ? 1 : 0);

  const selecionadosVisiveis = visiveis.filter((i) => selecionados.has(i.id));
  const todosMarcados = visiveis.length > 0 && selecionadosVisiveis.length === visiveis.length;

  function alternar(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function marcarTodos() {
    setSelecionados((s) => {
      const n = new Set(s);
      if (todosMarcados) visiveis.forEach((i) => n.delete(i.id));
      else visiveis.forEach((i) => n.add(i.id));
      return n;
    });
  }

  /** Avisa (sem bloquear) quando a ação faria passar das vagas. */
  function comAvisoDeVagas(ids: string[], executar: () => void) {
    const porSexo = { masculino: 0, feminino: 0 };
    for (const i of inscritos) if (ids.includes(i.id) && i.status !== "selecionado") porSexo[i.sexo]++;
    const excesso = (["masculino", "feminino"] as Sexo[]).filter(
      (s) => porSexo[s] > 0 && vagas[s] > 0 && contagem[s].sel + porSexo[s] > vagas[s],
    );
    if (excesso.length === 0) return executar();
    const texto = excesso
      .map((s) => `${s === "masculino" ? "Homens" : "Mulheres"}: ficaria ${contagem[s].sel + porSexo[s]} de ${vagas[s]} vagas`)
      .join(" · ");
    setAviso({ texto, executar });
  }

  function mudarStatusLote(status: StatusInscricao) {
    const ids = selecionadosVisiveis.map((i) => i.id);
    const executar = () =>
      iniciar(async () => {
        const r = await alterarStatus(ids, status);
        if (!r.ok) return void toast.error(r.erro);
        toast.success(`${ids.length} ${ids.length === 1 ? "inscrito atualizado" : "inscritos atualizados"}.`);
        setSelecionados(new Set());
      });
    if (status === "selecionado") comAvisoDeVagas(ids, executar);
    else executar();
  }

  function puxarLote() {
    const ids = selecionadosVisiveis.map((i) => i.id);
    comAvisoDeVagas(ids, () =>
      iniciar(async () => {
        const r = await puxarParaEquipe(ids);
        if (!r.ok) return void toast.error(r.erro);
        toast.success(
          r.dados.novos > 0
            ? `${r.dados.novos} ${r.dados.novos === 1 ? "pessoa puxada" : "pessoas puxadas"} para a equipe! 🎶`
            : "Essas pessoas já estavam na equipe.",
        );
        setSelecionados(new Set());
      }),
    );
  }

  function exportar(lista: InscritoLista[], sufixo: string) {
    const formsUsados = formularios.filter((f) => lista.some((i) => i.formulario_id === f.id));
    const pergs = formsUsados.flatMap((f) => f.perguntas.map((p) => ({ p, titulo: formsUsados.length > 1 ? `${p.rotulo} (${f.titulo})` : p.rotulo })));
    const cab = [
      "Nome", "Sexo", "Idade", "Nascimento", "Telefone", "Cidade", "Já trabalhou no EJC", "Equipe anterior", "Ano anterior",
      "Status", "Na equipe", "Média avaliações", "Nº avaliações", "Responsável", "Telefone responsável", "Formulário", "Inscrito em",
      ...pergs.map((x) => x.titulo),
    ];
    const titulos = Object.fromEntries(formularios.map((f) => [f.id, f.titulo]));
    const linhas = lista.map((i) => [
      i.nome, ROTULO_SEXO[i.sexo], i.idade, formatarData(`${i.nascimento}T12:00:00Z`), mascararTelefone(i.telefone), i.cidade,
      i.ja_trabalhou ? "Sim" : "Não", i.equipe_anterior, i.ano_anterior, rotuloStatus(i.status), i.naEquipe ? "Sim" : "Não",
      i.media !== null ? i.media.toFixed(1).replace(".", ",") : "", i.qtdAvaliacoes, i.resp_nome,
      i.resp_telefone ? mascararTelefone(i.resp_telefone) : "", titulos[i.formulario_id], formatarDataHora(i.criado_em),
      ...pergs.map(({ p }) => (i.formulario_id && p ? formatarResposta(p, i.respostas[p.id] as Resposta) : "")),
    ]);
    baixarCsv(`inscritos-${slugificar(nomeEdicao)}-${sufixo}`, gerarCsv(cab, linhas));
  }

  if (inscritos.length === 0) {
    return (
      <EstadoVazio
        icone={Users}
        titulo="Nenhuma inscrição ainda"
        descricao="Quando os jovens se inscreverem pelo link do formulário, eles aparecem aqui."
        acao={
          <Button asChild variant="outline">
            <Link href="/inscricoes">Ir para Inscrições</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Abas Homens / Mulheres com contador de vagas */}
      <div role="tablist" aria-label="Sexo" className="grid grid-cols-2 gap-2">
        {(["masculino", "feminino"] as Sexo[]).map((s) => {
          const ativo = aba === s;
          const passou = vagas[s] > 0 && contagem[s].sel > vagas[s];
          return (
            <button
              key={s}
              role="tab"
              aria-selected={ativo}
              onClick={() => setAba(s)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
              )}
            >
              <span className="block font-semibold">{s === "masculino" ? "Homens" : "Mulheres"}</span>
              <span className={cn("block text-sm", ativo ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {contagem[s].total} inscritos
              </span>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                  passou ? "bg-destructive text-white" : ativo ? "bg-destaque text-destaque-foreground" : "bg-muted",
                )}
              >
                {contagem[s].sel} / {vagas[s] || "—"} selecionados
              </span>
            </button>
          );
        })}
      </div>

      {/* Busca + filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={filtros.busca}
            onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
            placeholder="Buscar nome, cidade ou telefone"
            aria-label="Buscar"
            className="pl-9"
          />
        </div>
        <PainelFiltros
          filtros={filtros}
          setFiltros={setFiltros}
          formularios={formularios}
          cidades={cidades}
          perguntas={perguntas}
          qtdAtivos={qtdFiltrosAtivos}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={todosMarcados} onChange={marcarTodos} />
          Marcar todos ({visiveis.length})
        </label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportar(filtradosSemAba, "filtrado")}>
            <Download /> CSV filtrado
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportar(inscritos, "completo")}>
            <Download /> CSV completo
          </Button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">
          Ninguém encontrado com esses filtros.
        </p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((i) => (
            <ItemInscrito key={i.id} inscrito={i} marcado={selecionados.has(i.id)} aoMarcar={() => alternar(i.id)} />
          ))}
        </ul>
      )}

      {/* Barra de ações em lote */}
      {selecionadosVisiveis.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 p-3 shadow-lg backdrop-blur lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 lg:px-8">
            <p className="mr-auto text-sm font-semibold">
              {selecionadosVisiveis.length} {selecionadosVisiveis.length === 1 ? "marcado" : "marcados"}
              <button className="ml-2 text-muted-foreground underline" onClick={() => setSelecionados(new Set())}>
                limpar
              </button>
            </p>
            <Select onValueChange={(v) => mudarStatusLote(v as StatusInscricao)} value="" disabled={pendente}>
              <SelectTrigger className="w-44" aria-label="Mudar status">
                <SelectValue placeholder="Mudar status…" />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => (
                  <SelectItem key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={puxarLote} disabled={pendente}>
              <UserPlus /> Puxar para a equipe
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!aviso} onOpenChange={(v) => !v && setAviso(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Isso passa do número de vagas</AlertDialogTitle>
            <AlertDialogDescription>{aviso?.texto}. Deseja continuar mesmo assim?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                aviso?.executar();
                setAviso(null);
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ItemInscrito({ inscrito: i, marcado, aoMarcar }: { inscrito: InscritoLista; marcado: boolean; aoMarcar: () => void }) {
  const whats = linkWhatsApp(i.telefone);
  return (
    <li className={cn("flex items-stretch rounded-xl border bg-card", marcado && "border-primary ring-1 ring-primary")}>
      <label className="flex w-12 shrink-0 cursor-pointer items-center justify-center rounded-l-xl hover:bg-muted">
        <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={marcado} onChange={aoMarcar} aria-label={`Marcar ${i.nome}`} />
      </label>
      <Link href={`/selecao/${i.id}`} className="min-w-0 flex-1 py-3 pr-2">
        <p className="truncate font-semibold">{i.nome}</p>
        <p className="truncate text-sm text-muted-foreground">
          {i.idade} anos · {i.cidade}
          {i.ja_trabalhou && " · já trabalhou"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", classeStatus(i.status))}>{rotuloStatus(i.status)}</span>
          {i.naEquipe && (
            <Badge variant="outline" className="gap-1 border-emerald-600 text-emerald-800">
              <UserCheck className="size-3" /> Na equipe
            </Badge>
          )}
          {i.media !== null && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold" title={`${i.qtdAvaliacoes} avaliação(ões)`}>
              <Star className="size-3.5 fill-destaque text-destaque" aria-hidden />
              {i.media.toFixed(1).replace(".", ",")}
              <span className="font-normal text-muted-foreground">({i.qtdAvaliacoes})</span>
            </span>
          )}
          {!i.avalieiEu && <span className="text-xs text-muted-foreground">· sem sua nota</span>}
        </div>
      </Link>
      <div className="flex items-center gap-1 pr-2">
        {whats && (
          <Button asChild variant="ghost" size="icon" className="text-[#128c4a]">
            <a href={whats} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${i.nome}`}>
              <MessageCircle />
            </a>
          </Button>
        )}
        <ChevronRight className="hidden size-5 text-muted-foreground sm:block" aria-hidden />
      </div>
    </li>
  );
}

function PainelFiltros({
  filtros,
  setFiltros,
  formularios,
  cidades,
  perguntas,
  qtdAtivos,
}: {
  filtros: Filtros;
  setFiltros: React.Dispatch<React.SetStateAction<Filtros>>;
  formularios: Form[];
  cidades: string[];
  perguntas: (Pergunta & { form: string })[];
  qtdAtivos: number;
}) {
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setFiltros((f) => ({ ...f, [k]: v }));
  const pergunta = perguntas.find((p) => p.id === filtros.perguntaId);
  const TODOS = "__todos";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="relative shrink-0"
          aria-label={qtdAtivos ? `Filtros (${qtdAtivos} ativos)` : "Filtros"}
        >
          <Filter /> <span className="hidden sm:inline">Filtros</span>
          {qtdAtivos > 0 && (
            <span aria-hidden className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {qtdAtivos}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 px-4">
          {formularios.length > 1 && (
            <div className="space-y-2">
              <Label>Formulário</Label>
              <Select value={filtros.formulario || TODOS} onValueChange={(v) => setFiltros((f) => ({ ...f, formulario: v === TODOS ? "" : v, perguntaId: "", perguntaValor: "" }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {formularios.map((f) => <SelectItem key={f.id} value={f.id}>{f.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Status</legend>
            <div className="flex flex-wrap gap-2">
              {STATUS.map((s) => {
                const ativo = filtros.status.includes(s.valor);
                return (
                  <button
                    key={s.valor}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => set("status", ativo ? filtros.status.filter((x) => x !== s.valor) : [...filtros.status, s.valor])}
                    className={cn("min-h-10 rounded-full border px-3 text-sm", ativo ? "border-primary bg-primary text-primary-foreground" : "bg-background")}
                  >
                    {s.rotulo}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select value={filtros.cidade || TODOS} onValueChange={(v) => set("cidade", v === TODOS ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas</SelectItem>
                {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Faixa de idade</legend>
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="numeric" placeholder="De" aria-label="Idade mínima" value={filtros.idadeMin} onChange={(e) => set("idadeMin", e.target.value)} />
              <span className="text-muted-foreground">a</span>
              <Input type="number" inputMode="numeric" placeholder="Até" aria-label="Idade máxima" value={filtros.idadeMax} onChange={(e) => set("idadeMax", e.target.value)} />
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label>Já trabalhou no EJC?</Label>
            <Select value={filtros.jaTrabalhou || TODOS} onValueChange={(v) => set("jaTrabalhou", v === TODOS ? "" : (v as "sim" | "nao"))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Tanto faz</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {perguntas.length > 0 && (
            <fieldset className="space-y-2 rounded-xl border p-3">
              <legend className="px-1 text-sm font-medium">Por resposta de pergunta</legend>
              <Select value={filtros.perguntaId || TODOS} onValueChange={(v) => setFiltros((f) => ({ ...f, perguntaId: v === TODOS ? "" : v, perguntaValor: "" }))}>
                <SelectTrigger className="w-full" aria-label="Pergunta"><SelectValue placeholder="Escolha a pergunta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Nenhuma</SelectItem>
                  {perguntas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.rotulo}
                      {formularios.length > 1 && !filtros.formulario ? ` · ${p.form}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pergunta && <ValorPergunta pergunta={pergunta} valor={filtros.perguntaValor} aoMudar={(v) => set("perguntaValor", v)} />}
            </fieldset>
          )}
        </div>
        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setFiltros((f) => ({ ...FILTROS_VAZIOS, busca: f.busca }))}>
            <X /> Limpar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ValorPergunta({ pergunta: p, valor, aoMudar }: { pergunta: Pergunta; valor: string; aoMudar: (v: string) => void }) {
  if (p.tipo === "texto_curto" || p.tipo === "texto_longo") {
    return <Input value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="Contém o texto…" aria-label="Texto da resposta" />;
  }
  const opcoes =
    p.tipo === "sim_nao"
      ? [{ v: "sim", r: "Sim" }, { v: "nao", r: "Não" }]
      : p.tipo === "escala"
        ? [1, 2, 3, 4, 5].map((n) => ({ v: String(n), r: String(n) }))
        : p.opcoes.map((o) => ({ v: o, r: o }));
  return (
    <Select value={valor || undefined} onValueChange={aoMudar}>
      <SelectTrigger className="w-full" aria-label="Resposta"><SelectValue placeholder="Escolha a resposta" /></SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => <SelectItem key={o.v} value={o.v}>{o.r}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
