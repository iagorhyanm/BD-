import type { Metadata } from "next";
import { requireEdg } from "@/lib/auth";
import { listarEdicoes } from "@/lib/edicao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaEdicoes, NovaEdicao } from "./edicoes-client";

export const metadata: Metadata = { title: "Edições" };

export default async function EdicoesPage() {
  await requireEdg();
  const edicoes = await listarEdicoes();
  const textoLgpdPadrao = edicoes[0]?.texto_lgpd;

  return (
    <>
      <CabecalhoPagina
        titulo="Edições e configurações"
        descricao="Cada EJC é uma edição. Os dados do sistema ficam separados por edição."
        voltar={{ href: "/admin", rotulo: "Administração" }}
        acoes={<NovaEdicao textoLgpdPadrao={textoLgpdPadrao} />}
      />
      <ListaEdicoes edicoes={edicoes} />
    </>
  );
}
