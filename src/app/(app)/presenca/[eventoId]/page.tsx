import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listarMembros } from "@/lib/membros";
import { formatarDataHora } from "@/lib/datas";
import { ROTULO_TIPO_EVENTO } from "@/lib/dominio";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Chamada } from "./chamada";

export const metadata: Metadata = { title: "Chamada" };

export default async function ChamadaPage({ params }: { params: Promise<{ eventoId: string }> }) {
  await requireStaff();
  const { eventoId } = await params;
  const supabase = await createClient();
  const { data: ev } = await supabase.from("eventos").select("id, titulo, tipo, inicio, edicao_id").eq("id", eventoId).maybeSingle();
  if (!ev) notFound();

  const [membros, { data: presencas }, { data: escalas }] = await Promise.all([
    listarMembros(ev.edicao_id),
    supabase.from("presencas").select("membro_id, status, motivo").eq("evento_id", eventoId),
    supabase.from("escalas").select("membro_id").eq("evento_id", eventoId),
  ]);

  const registrados = new Map((presencas ?? []).map((p) => [p.membro_id, p]));
  const escalados = new Set((escalas ?? []).map((e) => e.membro_id));
  // Ativos + quem já tem registro (mesmo se ficou inativo depois).
  const lista = membros
    .filter((m) => m.ativo || registrados.has(m.id))
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      escalado: escalados.has(m.id),
      status: registrados.get(m.id)?.status ?? null,
      motivo: registrados.get(m.id)?.motivo ?? "",
    }))
    .sort((a, b) => Number(b.escalado) - Number(a.escalado) || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <>
      <CabecalhoPagina
        titulo={`Chamada · ${ev.titulo}`}
        descricao={`${ROTULO_TIPO_EVENTO[ev.tipo]} · ${formatarDataHora(ev.inicio, "dd/MM/yyyy HH:mm")}`}
        voltar={{ href: "/presenca", rotulo: "Presença" }}
      />
      <Chamada eventoId={eventoId} inicial={lista} />
    </>
  );
}
