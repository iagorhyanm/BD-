import type { Metadata } from "next";
import { requireUsuario } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormGrupo } from "../form-grupo";

export const metadata: Metadata = { title: "Novo desafio" };

export default async function NovoGrupoPage() {
  await requireUsuario();
  return (
    <>
      <CabecalhoPagina titulo="Novo desafio" voltar={{ href: "/grupos", rotulo: "Desafios" }} />
      <FormGrupo />
    </>
  );
}
