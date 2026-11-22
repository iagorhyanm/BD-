import type { Metadata } from "next";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormCheckin } from "../form-checkin";

export const metadata: Metadata = { title: "Registrar leitura" };

export default async function NovoCheckinPage() {
  const eu = await requireUsuario();
  const supabase = await createClient();
  // Sugere continuar de onde parou.
  const { data: ultimo } = await supabase
    .from("checkins")
    .select("livro, capitulo_fim")
    .eq("user_id", eu.id)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <CabecalhoPagina titulo="Registrar leitura" descricao="Cada dia com leitura vale 1 ponto nos seus desafios." />
      <FormCheckin userId={eu.id} ultimoLivro={ultimo ? { livro: ultimo.livro, capitulo: ultimo.capitulo_fim } : undefined} />
    </>
  );
}
