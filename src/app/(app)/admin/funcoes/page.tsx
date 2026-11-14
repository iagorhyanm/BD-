import type { Metadata } from "next";
import { requireEdg } from "@/lib/auth";
import { listarFuncoes } from "@/lib/membros";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { GestaoFuncoes } from "./gestao-funcoes";

export const metadata: Metadata = { title: "Funções e instrumentos" };

export default async function FuncoesPage() {
  await requireEdg();
  const funcoes = await listarFuncoes(true);
  return (
    <>
      <CabecalhoPagina
        titulo="Funções e instrumentos"
        descricao="Lista usada no cadastro de membros, na escala e nos avisos."
        voltar={{ href: "/admin", rotulo: "Administração" }}
      />
      <GestaoFuncoes funcoes={funcoes} />
    </>
  );
}
