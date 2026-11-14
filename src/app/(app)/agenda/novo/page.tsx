import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormEvento } from "../form-evento";

export const metadata: Metadata = { title: "Novo evento" };

export default async function NovoEventoPage() {
  await requireStaff();
  return (
    <>
      <CabecalhoPagina titulo="Novo evento" voltar={{ href: "/agenda", rotulo: "Agenda" }} />
      <FormEvento />
    </>
  );
}
