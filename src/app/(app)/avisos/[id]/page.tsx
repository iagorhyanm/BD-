import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listarFuncoes, listarMembros } from "@/lib/membros";
import { formatarDataHora } from "@/lib/datas";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EnviarAviso } from "./enviar-aviso";

export const metadata: Metadata = { title: "Enviar aviso" };

export default async function EnviarAvisoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: aviso } = await supabase
    .from("avisos")
    .select("*, aviso_envios(id, enviado_em, destinatarios, filtro_descricao, profiles(nome))")
    .eq("id", id)
    .maybeSingle();
  if (!aviso) notFound();

  const [membros, funcoes, { data: eventos }] = await Promise.all([
    listarMembros(aviso.edicao_id, true),
    listarFuncoes(),
    supabase
      .from("eventos")
      .select("id, titulo, inicio, escalas(membro_id)")
      .eq("edicao_id", aviso.edicao_id)
      .gte("inicio", new Date(Date.now() - 7 * 24 * 3600e3).toISOString())
      .order("inicio")
      .limit(30),
  ]);

  return (
    <>
      <CabecalhoPagina titulo="Enviar para membros" descricao={aviso.titulo} voltar={{ href: "/avisos", rotulo: "Avisos" }} />
      <EnviarAviso
        aviso={{ id: aviso.id, titulo: aviso.titulo, texto: aviso.texto }}
        membros={membros.filter((m) => m.telefone).map((m) => ({ id: m.id, nome: m.nome, sexo: m.sexo, telefone: m.telefone!, funcoes: m.funcoes }))}
        semTelefone={membros.filter((m) => !m.telefone).map((m) => m.nome)}
        funcoes={funcoes}
        eventos={(eventos ?? []).map((e) => ({
          id: e.id,
          rotulo: `${e.titulo} · ${formatarDataHora(e.inicio, "dd/MM HH:mm")}`,
          membros: [...new Set((e.escalas ?? []).map((x) => x.membro_id))],
        }))}
        historico={[...(aviso.aviso_envios ?? [])]
          .sort((a, b) => b.enviado_em.localeCompare(a.enviado_em))
          .map((e) => ({
            id: e.id,
            quando: e.enviado_em,
            destinatarios: e.destinatarios,
            filtro: e.filtro_descricao,
            por: (e.profiles as { nome: string } | null)?.nome ?? "—",
          }))}
      />
    </>
  );
}
