"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { AvatarNome } from "@/components/avatar-nome";
import { DIAS_SEMANA, descreverAgenda, personalizar, type Recorrencia } from "@/lib/agenda";
import { hojeEmBelem } from "@/lib/datas";
import { salvarNotificacao, testarNotificacao, type DadosNotificacao } from "@/server/actions/admin-notificacoes";
import { cn } from "@/lib/utils";

type Pessoa = { id: string; nome: string; email: string; foto: string | null };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const SUGESTOES: { rotulo: string; dados: Partial<DadosNotificacao> }[] = [
  {
    rotulo: "☀️ Bom dia (6h, todo dia)",
    dados: { titulo: "Bom dia, {nome}! ☀️", mensagem: "Que tal aproveitarmos esse horário para estudarmos um pouco mais? Hoje é {leitura}.", recorrencia: "diaria", hora: "06:00", destino: "/" },
  },
  {
    rotulo: "🌙 Boa noite (21h, quem não leu)",
    dados: { titulo: "Ainda dá tempo, {nome}! 🌙", mensagem: "Separe uns minutinhos antes de dormir para {leitura}.", recorrencia: "diaria", hora: "21:00", destino: "/checkin/novo", so_quem_nao_leu: true },
  },
  {
    rotulo: "⛪ Domingo (8h)",
    dados: { titulo: "Bom domingo, {nome}! ⛪", mensagem: "Que a Palavra de hoje te acompanhe no culto: {leitura}.", recorrencia: "semanal", dias_semana: [0], hora: "08:00", destino: "/" },
  },
];

const OPCOES_RECORRENCIA: { valor: Recorrencia; rotulo: string }[] = [
  { valor: "diaria", rotulo: "Todos os dias" },
  { valor: "semanal", rotulo: "Dias da semana" },
  { valor: "uma_vez", rotulo: "Uma vez" },
];

export function FormNotificacao({
  id,
  inicial,
  grupos,
  pessoas,
  meuNome,
  leituraHoje,
}: {
  id?: string;
  inicial?: DadosNotificacao;
  grupos: { id: string; nome: string }[];
  pessoas: Pessoa[];
  meuNome: string;
  leituraHoje: string;
}) {
  const router = useRouter();
  const [d, setD] = useState<DadosNotificacao>(
    inicial ?? {
      titulo: "",
      mensagem: "",
      destino: "/",
      recorrencia: "diaria",
      data: hojeEmBelem(),
      hora: "06:00",
      dias_semana: [],
      publico: "todos",
      grupo_id: grupos[0]?.id ?? null,
      pessoas: [],
      so_quem_nao_leu: false,
    },
  );
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [testando, iniciarTeste] = useTransition();
  const campoFoco = useRef<"titulo" | "mensagem">("mensagem");
  const set = <K extends keyof DadosNotificacao>(k: K, v: DadosNotificacao[K]) => setD((x) => ({ ...x, [k]: v }));

  const v = { nome: meuNome, leitura: leituraHoje, sequencia: 7 };
  const filtradas = useMemo(() => pessoas.filter((p) => norm(`${p.nome} ${p.email}`).includes(norm(busca.trim()))), [pessoas, busca]);

  function inserir(variavel: string) {
    const campo = campoFoco.current;
    set(campo, `${d[campo]}${d[campo] && !d[campo].endsWith(" ") ? " " : ""}${variavel}`);
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarNotificacao(id ?? null, { ...d, hora: d.hora.slice(0, 5) });
      if (!r.ok) return setErro(r.erro);
      toast.success(id ? "Notificação atualizada." : "Notificação programada! 🔔");
      router.push("/admin/notificacoes");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {!id && (
        <section className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="size-4 text-primary" aria-hidden /> Comece por uma sugestão
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s.rotulo}
                type="button"
                onClick={() => setD((x) => ({ ...x, dias_semana: [], so_quem_nao_leu: false, ...s.dados }))}
                className="min-h-10 rounded-full border bg-card px-3 text-sm hover:border-primary/50"
              >
                {s.rotulo}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Mensagem</h2>
        <div className="space-y-2">
          <Label htmlFor="nt-titulo">Título</Label>
          <Input id="nt-titulo" maxLength={80} value={d.titulo} onFocus={() => (campoFoco.current = "titulo")} onChange={(e) => set("titulo", e.target.value)} placeholder="Bom dia, {nome}! ☀️" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nt-msg">Texto</Label>
          <Textarea id="nt-msg" rows={3} maxLength={300} value={d.mensagem} onFocus={() => (campoFoco.current = "mensagem")} onChange={(e) => set("mensagem", e.target.value)} placeholder="Que tal aproveitarmos esse horário para estudarmos um pouco mais?" />
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Personalizar:
            {[
              ["{nome}", "nome da pessoa"],
              ["{leitura}", "leitura do dia"],
              ["{sequencia}", "dias seguidos"],
            ].map(([k, t]) => (
              <button key={k} type="button" onClick={() => inserir(k)} className="rounded-full border bg-background px-2 py-1 font-mono text-foreground" title={t}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Prévia (como você receberia)</p>
          <div className="flex gap-3 rounded-xl bg-background p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="size-10 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{personalizar(d.titulo, v) || "Título da notificação"}</p>
              <p className="line-clamp-3 text-sm text-muted-foreground">{personalizar(d.mensagem, v) || "Texto da notificação"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Quando</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Repetição">
          {OPCOES_RECORRENCIA.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={d.recorrencia === o.valor}
              onClick={() => set("recorrencia", o.valor)}
              className={cn("min-h-11 rounded-xl border px-2 text-sm font-medium", d.recorrencia === o.valor ? "border-primary bg-primary text-primary-foreground" : "bg-background")}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        {d.recorrencia === "semanal" && (
          <div className="flex flex-wrap gap-2" aria-label="Dias da semana">
            {DIAS_SEMANA.map((nome, i) => {
              const ativo = d.dias_semana.includes(i);
              return (
                <button
                  key={nome}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => set("dias_semana", ativo ? d.dias_semana.filter((x) => x !== i) : [...d.dias_semana, i])}
                  className={cn("size-11 rounded-full border text-sm font-medium", ativo ? "border-primary bg-primary text-primary-foreground" : "bg-background")}
                >
                  {nome}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {d.recorrencia === "uma_vez" && (
            <div className="space-y-2">
              <Label htmlFor="nt-data">Data</Label>
              <Input id="nt-data" type="date" min={hojeEmBelem()} value={d.data ?? ""} onChange={(e) => set("data", e.target.value)} className="w-44" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="nt-hora">Hora (Belém)</Label>
            <Input id="nt-hora" type="time" step={300} value={d.hora.slice(0, 5)} onChange={(e) => set("hora", e.target.value)} className="w-32" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {descreverAgenda({ recorrencia: d.recorrencia, data: d.data, hora: d.hora || "00:00", diasSemana: d.dias_semana })}. Pode chegar até 5 minutos depois.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Para quem</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Público">
          {(
            [
              ["todos", "Todo mundo"],
              ["grupo", "Um desafio"],
              ["pessoas", "Escolher pessoas"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={d.publico === valor}
              onClick={() => set("publico", valor)}
              className={cn("min-h-11 rounded-xl border px-2 text-sm font-medium", d.publico === valor ? "border-primary bg-primary text-primary-foreground" : "bg-background")}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {d.publico === "grupo" &&
          (grupos.length ? (
            <select
              aria-label="Desafio"
              value={d.grupo_id ?? ""}
              onChange={(e) => set("grupo_id", e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
            >
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum desafio criado ainda.</p>
          ))}
        {d.publico === "pessoas" && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou e-mail" aria-label="Buscar pessoa" className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">{d.pessoas.length} escolhida(s)</p>
            <ul className="max-h-72 divide-y overflow-y-auto rounded-xl border">
              {filtradas.map((p) => {
                const marcado = d.pessoas.includes(p.id);
                return (
                  <li key={p.id}>
                    <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2", marcado && "bg-primary/5")}>
                      <input
                        type="checkbox"
                        className="size-5 accent-primary"
                        checked={marcado}
                        aria-label={`Enviar para ${p.nome}`}
                        onChange={() => set("pessoas", marcado ? d.pessoas.filter((x) => x !== p.id) : [...d.pessoas, p.id])}
                      />
                      <AvatarNome nome={p.nome} id={p.id} foto={p.foto} tamanho="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nome}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-primary" checked={d.so_quem_nao_leu} onChange={(e) => set("so_quem_nao_leu", e.target.checked)} />
          Só para quem ainda não marcou a leitura do dia
        </label>
        <div className="space-y-2">
          <Label htmlFor="nt-destino">Ao tocar na notificação, abrir</Label>
          <select
            id="nt-destino"
            value={d.destino}
            onChange={(e) => set("destino", e.target.value as DadosNotificacao["destino"])}
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="/">Início</option>
            <option value="/checkin/novo">Marcar a leitura de hoje</option>
            <option value="/plano">Plano de leitura</option>
            <option value="/grupos">Desafios</option>
          </select>
        </div>
      </section>

      <AlertaErro mensagem={erro} />
      <div className="space-y-2">
        <Button size="lg" className="h-13 w-full text-base" disabled={pendente} onClick={salvar}>
          {pendente ? "Salvando…" : id ? "Salvar alterações" : "Programar notificação 🔔"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={testando}
          onClick={() =>
            iniciarTeste(async () => {
              const r = await testarNotificacao({ titulo: d.titulo, mensagem: d.mensagem, destino: d.destino });
              if (!r.ok) toast.error(r.erro);
              else toast.success("Teste enviado para o seu celular!");
            })
          }
        >
          <Send /> {testando ? "Enviando…" : "Enviar um teste para mim agora"}
        </Button>
      </div>
    </div>
  );
}
