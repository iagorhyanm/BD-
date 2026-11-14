"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List, MapPin, Users } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/estado-vazio";
import { FUSO, capitalizar, formatarDataHora } from "@/lib/datas";
import { CLASSE_TIPO_EVENTO, ROTULO_TIPO_EVENTO, type TipoEvento } from "@/lib/dominio";
import { cn } from "@/lib/utils";

export type EventoAgenda = {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  escalados: number;
};

const diaBelem = (iso: string | Date) => formatInTimeZone(new Date(iso), FUSO, "yyyy-MM-dd");

export function VisaoAgenda({ eventos }: { eventos: EventoAgenda[] }) {
  const [modo, setModo] = useState<"lista" | "calendario">("lista");

  if (eventos.length === 0) {
    return (
      <EstadoVazio
        icone={CalendarDays}
        titulo="Nenhum evento ainda"
        descricao="Cadastre o primeiro ensaio ou apresentação."
        acao={
          <Button asChild>
            <Link href="/agenda/novo">Novo evento</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Visualização" className="inline-flex rounded-lg border bg-card p-1">
        {(
          [
            ["lista", "Lista", List],
            ["calendario", "Calendário", CalendarDays],
          ] as const
        ).map(([v, r, Icone]) => (
          <button
            key={v}
            role="tab"
            aria-selected={modo === v}
            onClick={() => setModo(v)}
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-medium",
              modo === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Icone className="size-4" aria-hidden /> {r}
          </button>
        ))}
      </div>
      {modo === "lista" ? <Lista eventos={eventos} /> : <Calendario eventos={eventos} />}
    </div>
  );
}

function CartaoEvento({ e }: { e: EventoAgenda }) {
  return (
    <Link href={`/agenda/${e.id}`} className="flex gap-3 rounded-xl border bg-card p-3 hover:border-primary/40">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted py-1.5 text-center">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {formatInTimeZone(new Date(e.inicio), FUSO, "EEE", { locale: ptBR })}
        </span>
        <span className="text-xl leading-tight font-bold">{formatInTimeZone(new Date(e.inicio), FUSO, "dd")}</span>
        <span className="text-xs text-muted-foreground">{formatInTimeZone(new Date(e.inicio), FUSO, "MMM", { locale: ptBR })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", CLASSE_TIPO_EVENTO[e.tipo])}>
          {ROTULO_TIPO_EVENTO[e.tipo]}
        </span>
        <p className="mt-1 truncate font-semibold">{e.titulo}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          <span>
            {formatarDataHora(e.inicio, "HH:mm")}
            {e.fim && `–${formatarDataHora(e.fim, "HH:mm")}`}
          </span>
          {e.local && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="size-3.5" aria-hidden /> {e.local}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden /> {e.escalados} na escala
          </span>
        </p>
      </div>
    </Link>
  );
}

function Lista({ eventos }: { eventos: EventoAgenda[] }) {
  const hoje = diaBelem(new Date());
  const proximos = eventos.filter((e) => diaBelem(e.inicio) >= hoje);
  const passados = eventos.filter((e) => diaBelem(e.inicio) < hoje).reverse();
  const [verPassados, setVerPassados] = useState(false);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-semibold">Próximos</h2>
        {proximos.length ? (
          <ul className="space-y-2">{proximos.map((e) => <li key={e.id}><CartaoEvento e={e} /></li>)}</ul>
        ) : (
          <p className="rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">Nenhum evento futuro.</p>
        )}
      </section>
      {passados.length > 0 && (
        <section>
          <Button variant="ghost" onClick={() => setVerPassados((v) => !v)}>
            {verPassados ? "Esconder" : "Mostrar"} eventos passados ({passados.length})
          </Button>
          {verPassados && (
            <ul className="mt-2 space-y-2 opacity-80">{passados.map((e) => <li key={e.id}><CartaoEvento e={e} /></li>)}</ul>
          )}
        </section>
      )}
    </div>
  );
}

function Calendario({ eventos }: { eventos: EventoAgenda[] }) {
  const hoje = diaBelem(new Date());
  const [mes, setMes] = useState(() => {
    const prox = eventos.find((e) => diaBelem(e.inicio) >= hoje);
    return (prox ? diaBelem(prox.inicio) : hoje).slice(0, 7);
  });
  const [diaSel, setDiaSel] = useState<string | null>(null);

  const porDia = useMemo(() => {
    const m: Record<string, EventoAgenda[]> = {};
    for (const e of eventos) (m[diaBelem(e.inicio)] ??= []).push(e);
    return m;
  }, [eventos]);

  const [ano, mesNum] = mes.split("-").map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, mesNum - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
  const celulas: (string | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (celulas.length % 7) celulas.push(null);

  const mudarMes = (delta: number) => {
    const d = new Date(Date.UTC(ano, mesNum - 1 + delta, 1));
    setMes(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    setDiaSel(null);
  };
  const nomeMes = new Date(Date.UTC(ano, mesNum - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const doDia = diaSel ? porDia[diaSel] ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><ChevronLeft /></Button>
          <h2 className="font-semibold" aria-live="polite">{capitalizar(nomeMes)}</h2>
          <Button variant="ghost" size="icon" onClick={() => mudarMes(1)} aria-label="Próximo mês"><ChevronRight /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground" aria-hidden>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celulas.map((dia, i) => {
            if (!dia) return <div key={i} />;
            const evs = porDia[dia] ?? [];
            const sel = diaSel === dia;
            return (
              <button
                key={dia}
                onClick={() => setDiaSel(sel ? null : dia)}
                aria-label={`${Number(dia.slice(8))}${evs.length ? `, ${evs.length} evento(s)` : ""}`}
                aria-pressed={sel}
                className={cn(
                  "flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-sm",
                  sel ? "bg-primary text-primary-foreground" : evs.length ? "bg-muted font-semibold" : "hover:bg-muted",
                  dia === hoje && !sel && "ring-2 ring-destaque",
                )}
              >
                {Number(dia.slice(8))}
                {evs.length > 0 && (
                  <span className="flex gap-0.5" aria-hidden>
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className={cn("size-1.5 rounded-full", e.tipo === "apresentacao" ? "bg-destaque" : sel ? "bg-primary-foreground" : "bg-sky-600")} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-sky-600" /> Ensaio</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-destaque" /> Apresentação</span>
        </p>
      </div>
      {diaSel && (
        <section>
          <h3 className="mb-2 font-semibold">
            {new Date(`${diaSel}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
          </h3>
          {doDia.length ? (
            <ul className="space-y-2">{doDia.map((e) => <li key={e.id}><CartaoEvento e={e} /></li>)}</ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
          )}
        </section>
      )}
    </div>
  );
}
