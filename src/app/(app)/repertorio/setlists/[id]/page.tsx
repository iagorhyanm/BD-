import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatarDataHora } from "@/lib/datas";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EditorSetlist } from "./editor-setlist";

export const metadata: Metadata = { title: "Setlist" };

export default async function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("setlists")
    .select("*, setlist_itens(id, musica_id, ordem, tom, observacao)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  const [{ data: musicas }, { data: eventos }] = await Promise.all([
    supabase.from("musicas").select("id, titulo, artista, tom, momentos, cifra_url").order("titulo"),
    supabase
      .from("eventos")
      .select("id, titulo, inicio, setlists(id)")
      .eq("edicao_id", s.edicao_id)
      .order("inicio", { ascending: false }),
  ]);

  return (
    <>
      <CabecalhoPagina titulo={s.titulo} voltar={{ href: "/repertorio?aba=setlists", rotulo: "Setlists" }} />
      <EditorSetlist
        setlist={{ id: s.id, titulo: s.titulo, observacoes: s.observacoes, eventoId: s.evento_id }}
        itensIniciais={[...(s.setlist_itens ?? [])]
          .sort((a, b) => a.ordem - b.ordem)
          .map((i) => ({ chave: i.id, musica_id: i.musica_id, tom: i.tom ?? "", observacao: i.observacao ?? "" }))}
        musicas={musicas ?? []}
        eventos={(eventos ?? [])
          .filter((e) => {
            const vinc = Array.isArray(e.setlists) ? e.setlists : e.setlists ? [e.setlists] : [];
            return vinc.length === 0 || vinc.some((x) => x.id === s.id);
          })
          .map((e) => ({ id: e.id, rotulo: `${e.titulo} · ${formatarDataHora(e.inicio, "dd/MM HH:mm")}` }))}
      />
    </>
  );
}
