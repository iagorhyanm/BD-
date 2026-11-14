import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, MapPin, Pencil } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listarFuncoes, listarMembros } from "@/lib/membros";
import { capitalizar, formatarDataHora } from "@/lib/datas";
import { CLASSE_TIPO_EVENTO, ROTULO_TIPO_EVENTO, seSobrepoem } from "@/lib/dominio";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EditorEscala, type Conflito } from "./editor-escala";
import { SetlistDoEvento } from "./setlist-evento";
import { ChecklistEvento } from "./checklist-evento";
import { ExcluirEvento } from "./excluir-evento";

export const metadata: Metadata = { title: "Evento" };

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: ev } = await supabase.from("eventos").select("*").eq("id", id).maybeSingle();
  if (!ev) notFound();

  const janelaIni = new Date(new Date(ev.inicio).getTime() - 24 * 3600e3).toISOString();
  const janelaFim = new Date(new Date(ev.inicio).getTime() + 24 * 3600e3).toISOString();

  const [
    { data: escalas },
    membros,
    funcoes,
    { data: vizinhos },
    { data: setlist },
    { data: checklist },
    { data: equipamentos },
    { count: presencas },
    { data: anteriores },
  ] = await Promise.all([
    supabase.from("escalas").select("id, membro_id, funcao_id, membros(nome), funcoes(nome, ordem)").eq("evento_id", id),
    listarMembros(ev.edicao_id, true),
    listarFuncoes(true),
    supabase
      .from("eventos")
      .select("id, titulo, inicio, fim, escalas(membro_id)")
      .eq("edicao_id", ev.edicao_id)
      .neq("id", id)
      .gte("inicio", janelaIni)
      .lte("inicio", janelaFim),
    supabase
      .from("setlists")
      .select("id, titulo, setlist_itens(id, ordem, tom, musicas(titulo, artista, tom))")
      .eq("evento_id", id)
      .maybeSingle(),
    supabase.from("checklist_itens").select("*, profiles(nome)").eq("evento_id", id).order("ordem"),
    supabase.from("equipamentos").select("id, item, quantidade, estado").eq("edicao_id", ev.edicao_id).order("item"),
    supabase.from("presencas").select("id", { count: "exact", head: true }).eq("evento_id", id),
    supabase
      .from("eventos")
      .select("id, titulo, inicio, escalas(count)")
      .eq("edicao_id", ev.edicao_id)
      .neq("id", id)
      .lt("inicio", ev.inicio)
      .order("inicio", { ascending: false })
      .limit(8),
  ]);

  // Conflitos: mesma pessoa em 2+ funções neste evento, ou escalada em evento com horário sobreposto.
  const conflitos: Conflito[] = [];
  const porMembro = new Map<string, string[]>();
  for (const e of escalas ?? []) porMembro.set(e.membro_id, [...(porMembro.get(e.membro_id) ?? []), e.funcoes?.nome ?? ""]);
  for (const [membroId, fs] of porMembro) {
    const nome = (escalas ?? []).find((e) => e.membro_id === membroId)?.membros?.nome ?? "";
    if (fs.length > 1) conflitos.push({ membroId, texto: `${nome} está em ${fs.length} funções neste evento (${fs.join(", ")}).` });
    for (const v of vizinhos ?? []) {
      if (seSobrepoem(ev, v) && (v.escalas ?? []).some((x) => x.membro_id === membroId)) {
        conflitos.push({
          membroId,
          texto: `${nome} também está escalado(a) em “${v.titulo}” (${formatarDataHora(v.inicio, "dd/MM HH:mm")}), no mesmo horário.`,
        });
      }
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo={ev.titulo}
        voltar={{ href: "/agenda", rotulo: "Agenda" }}
        acoes={
          <Button asChild variant="outline">
            <Link href={`/agenda/${id}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-4">
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", CLASSE_TIPO_EVENTO[ev.tipo])}>
              {ROTULO_TIPO_EVENTO[ev.tipo]}
            </span>
            <p className="text-lg font-semibold">
              {capitalizar(formatarDataHora(ev.inicio, "EEEE, dd 'de' MMMM"))} · {formatarDataHora(ev.inicio, "HH:mm")}
              {ev.fim && `–${formatarDataHora(ev.fim, "HH:mm")}`}
            </p>
            {ev.local && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" aria-hidden /> {ev.local}
              </p>
            )}
            {ev.pauta && (
              <div className="border-t pt-3">
                <h2 className="mb-1 text-sm font-semibold">Pauta</h2>
                <p className="whitespace-pre-line">{ev.pauta}</p>
              </div>
            )}
          </section>

          <EditorEscala
            eventoId={id}
            escalas={(escalas ?? []).map((e) => ({
              id: e.id,
              membroId: e.membro_id,
              funcaoId: e.funcao_id,
              membro: e.membros?.nome ?? "",
              funcao: e.funcoes?.nome ?? "",
              ordemFuncao: e.funcoes?.ordem ?? 0,
            }))}
            membros={membros.map((m) => ({ id: m.id, nome: m.nome, funcoes: m.funcoes }))}
            funcoes={funcoes.filter((f) => f.ativo)}
            conflitos={conflitos}
            anteriores={(anteriores ?? [])
              .filter((a) => (a.escalas?.[0]?.count ?? 0) > 0)
              .map((a) => ({ id: a.id, rotulo: `${a.titulo} · ${formatarDataHora(a.inicio, "dd/MM")}` }))}
          />

          <SetlistDoEvento
            eventoId={id}
            tituloEvento={ev.titulo}
            setlist={
              setlist
                ? {
                    id: setlist.id,
                    titulo: setlist.titulo,
                    itens: [...(setlist.setlist_itens ?? [])]
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((i) => ({ id: i.id, titulo: i.musicas?.titulo ?? "", artista: i.musicas?.artista ?? null, tom: i.tom ?? i.musicas?.tom ?? null })),
                  }
                : null
            }
          />
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Chamada</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {presencas ? `${presencas} registro(s) de presença.` : "Ainda não foi feita."}
            </p>
            <Button asChild className="mt-3 w-full">
              <Link href={`/presenca/${id}`}>
                <ClipboardCheck /> {presencas ? "Ver / editar chamada" : "Fazer chamada"}
              </Link>
            </Button>
          </section>

          <ChecklistEvento
            eventoId={id}
            destaque={ev.tipo === "apresentacao"}
            itens={(checklist ?? []).map((c) => ({
              id: c.id,
              descricao: c.descricao,
              quantidade: c.quantidade,
              conferido: c.conferido,
              equipamentoId: c.equipamento_id,
              conferidoPor: (c.profiles as { nome: string } | null)?.nome ?? null,
            }))}
            equipamentos={(equipamentos ?? []).map((e) => ({ id: e.id, item: e.item, quantidade: e.quantidade, estado: e.estado }))}
          />

          <ExcluirEvento id={id} titulo={ev.titulo} />
        </div>
      </div>
    </>
  );
}
