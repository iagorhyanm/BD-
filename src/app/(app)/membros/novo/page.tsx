import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listarFuncoes } from "@/lib/membros";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormMembro } from "../form-membro";

export const metadata: Metadata = { title: "Novo membro" };

export default async function NovoMembroPage() {
  await requireStaff();
  const funcoes = await listarFuncoes();
  return (
    <>
      <CabecalhoPagina titulo="Novo membro" voltar={{ href: "/membros", rotulo: "Membros" }} />
      <FormMembro funcoes={funcoes} />
    </>
  );
}
