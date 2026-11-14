import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { SemEdicao } from "@/components/sem-edicao";
import { VisaoPresenca } from "./visao-presenca";

export const metadata: Metadata = { title: "Presença" };

export default async function PresencaPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return <SemEdicao titulo="Presença" />;
  const { aba } = await searchParams;

  const supabase = await createClient();
  const [{ data: eventos }, { data: resumo }, { count: ativos }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, tipo, inicio, presencas(status)")
      .eq("edicao_id", edicao.id)
      .lte("inicio", new Date(Date.now() + 24 * 3600e3).toISOString())
      .order("inicio", { ascending: false }),
    supabase.from("resumo_presenca").select("*").eq("edicao_id", edicao.id).eq("ativo", true).order("faltas", { ascending: false }).order("nome"),
    supabase.from("membros").select("id", { count: "exact", head: true }).eq("edicao_id", edicao.id).eq("ativo", true),
  ]);

  return (
    <>
      <CabecalhoPagina titulo="Presença" descricao={`Limite de faltas: ${edicao.limite_faltas} (faltas não justificadas).`} />
      <VisaoPresenca
        abaInicial={aba === "relatorio" ? "relatorio" : "chamadas"}
        limite={edicao.limite_faltas}
        totalAtivos={ativos ?? 0}
        eventos={(eventos ?? []).map((e) => ({
          id: e.id,
          titulo: e.titulo,
          tipo: e.tipo,
          inicio: e.inicio,
          registros: e.presencas?.length ?? 0,
          presentes: (e.presencas ?? []).filter((p) => p.status === "presente" || p.status === "atraso").length,
        }))}
        resumo={(resumo ?? []).map((r) => ({
          membroId: r.membro_id!,
          nome: r.nome!,
          registros: r.registros ?? 0,
          presentes: r.presentes ?? 0,
          atrasos: r.atrasos ?? 0,
          faltas: r.faltas ?? 0,
          justificadas: r.justificadas ?? 0,
          percentual: r.percentual,
        }))}
      />
    </>
  );
}
