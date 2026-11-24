import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormNotificacao } from "../form-notificacao";
import { dadosDoFormulario } from "../dados";

export const metadata: Metadata = { title: "Nova notificação" };

export default async function NovaNotificacaoPage() {
  const eu = await requireAdmin();
  const dados = await dadosDoFormulario();
  return (
    <>
      <CabecalhoPagina titulo="Nova notificação" voltar={{ href: "/admin/notificacoes", rotulo: "Notificações" }} />
      <FormNotificacao {...dados} meuNome={eu.nome} />
    </>
  );
}
