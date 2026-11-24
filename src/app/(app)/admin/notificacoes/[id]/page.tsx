import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormNotificacao } from "../form-notificacao";
import { dadosDoFormulario } from "../dados";
import type { DadosNotificacao } from "@/server/actions/admin-notificacoes";

export const metadata: Metadata = { title: "Editar notificação" };

export default async function EditarNotificacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: n } = await supabase.from("notificacoes_programadas").select("*").eq("id", id).maybeSingle();
  if (!n) notFound();
  const dados = await dadosDoFormulario();
  const inicial: DadosNotificacao = {
    titulo: n.titulo,
    mensagem: n.mensagem,
    destino: n.destino as DadosNotificacao["destino"],
    recorrencia: n.recorrencia as DadosNotificacao["recorrencia"],
    data: n.data,
    hora: n.hora.slice(0, 5),
    dias_semana: n.dias_semana,
    publico: n.publico as DadosNotificacao["publico"],
    grupo_id: n.grupo_id ?? dados.grupos[0]?.id ?? null,
    pessoas: n.pessoas,
    so_quem_nao_leu: n.so_quem_nao_leu,
  };
  return (
    <>
      <CabecalhoPagina titulo="Editar notificação" voltar={{ href: "/admin/notificacoes", rotulo: "Notificações" }} />
      <FormNotificacao id={id} inicial={inicial} {...dados} meuNome={eu.nome} />
    </>
  );
}
