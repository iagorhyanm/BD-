import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormGrupo } from "../../form-grupo";

export const metadata: Metadata = { title: "Editar desafio" };

export default async function EditarGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUsuario();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: g }, { data: papel }] = await Promise.all([
    supabase.from("grupos").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("papel_no_grupo", { p_grupo: id }),
  ]);
  if (!g) notFound();
  if (papel !== "dono" && papel !== "admin") redirect(`/grupos/${id}`);
  return (
    <>
      <CabecalhoPagina titulo="Editar desafio" voltar={{ href: `/grupos/${id}`, rotulo: g.nome }} />
      <FormGrupo grupo={{ id: g.id, nome: g.nome, descricao: g.descricao, inicio: g.inicio, fim: g.fim, ehDono: papel === "dono" }} />
    </>
  );
}
