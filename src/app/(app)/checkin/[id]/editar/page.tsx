import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormCheckin } from "../../form-checkin";

export const metadata: Metadata = { title: "Editar leitura" };

export default async function EditarCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await requireUsuario();
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("checkins").select("*, plano_dias(leitura)").eq("id", id).eq("user_id", eu.id).maybeSingle();
  if (!c) notFound();
  const foto = c.foto_path ? (await supabase.storage.from("checkins").createSignedUrl(c.foto_path, 3600)).data?.signedUrl ?? null : null;
  return (
    <>
      <CabecalhoPagina titulo="Editar leitura" voltar={{ href: `/checkin/${id}`, rotulo: "Voltar" }} />
      <FormCheckin userId={eu.id} checkin={{ ...c, leitura: c.plano_dias?.leitura ?? "", fotoUrl: foto }} />
    </>
  );
}
