import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { listarMembros } from "@/lib/membros";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { VisaoRepertorio } from "./visao-repertorio";

export const metadata: Metadata = { title: "Repertório" };

export default async function RepertorioPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  const { aba } = await searchParams;
  const supabase = await createClient();

  const [{ data: musicas }, { data: setlists }, membros] = await Promise.all([
    supabase.from("musicas").select("*, musica_interpretes(membro_id)").order("titulo"),
    edicao
      ? supabase
          .from("setlists")
          .select("id, titulo, evento_id, eventos(titulo, inicio), setlist_itens(count)")
          .eq("edicao_id", edicao.id)
          .order("criado_em", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    edicao ? listarMembros(edicao.id, true) : Promise.resolve([]),
  ]);

  const idsMembros = new Set(membros.map((m) => m.id));

  return (
    <>
      <CabecalhoPagina titulo="Repertório" descricao="A biblioteca de músicas é compartilhada entre todas as edições." />
      <VisaoRepertorio
        abaInicial={aba === "setlists" ? "setlists" : "musicas"}
        temEdicao={!!edicao}
        membros={membros.map((m) => ({ id: m.id, nome: m.nome }))}
        musicas={(musicas ?? []).map((m) => ({
          id: m.id,
          titulo: m.titulo,
          artista: m.artista,
          tom: m.tom,
          bpm: m.bpm,
          momentos: m.momentos,
          cifra_url: m.cifra_url,
          media_url: m.media_url,
          observacoes: m.observacoes,
          interpretes: (m.musica_interpretes ?? []).map((i) => i.membro_id).filter((id) => idsMembros.has(id)),
        }))}
        setlists={(setlists ?? []).map((s) => ({
          id: s.id,
          titulo: s.titulo,
          evento: s.eventos ? { titulo: s.eventos.titulo, inicio: s.eventos.inicio } : null,
          itens: s.setlist_itens?.[0]?.count ?? 0,
        }))}
      />
    </>
  );
}
