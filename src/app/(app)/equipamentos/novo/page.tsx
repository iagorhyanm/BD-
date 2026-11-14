import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormEquipamento } from "../form-equipamento";

export const metadata: Metadata = { title: "Novo item" };

export default async function NovoEquipPage() {
  await requireStaff();
  return (
    <>
      <CabecalhoPagina titulo="Novo item" voltar={{ href: "/equipamentos", rotulo: "Equipamentos" }} descricao="A foto pode ser adicionada depois de salvar." />
      <FormEquipamento categorias={[]} />
    </>
  );
}
