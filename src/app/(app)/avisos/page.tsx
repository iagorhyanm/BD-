import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { SemEdicao } from "@/components/sem-edicao";
import { MuralAvisos } from "./mural";

export const metadata: Metadata = { title: "Avisos" };

export default async function AvisosPage() {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return <SemEdicao titulo="Avisos" />;
  const supabase = await createClient();
  const { data: avisos } = await supabase
    .from("avisos")
    .select("*, profiles(nome), aviso_envios(id, enviado_em, destinatarios)")
    .eq("edicao_id", edicao.id)
    .order("fixado", { ascending: false })
    .order("criado_em", { ascending: false });

  return (
    <>
      <CabecalhoPagina titulo="Avisos" descricao="Mural dos coordenadores e envio para os membros pelo WhatsApp." />
      <MuralAvisos
        avisos={(avisos ?? []).map((a) => ({
          id: a.id,
          titulo: a.titulo,
          texto: a.texto,
          fixado: a.fixado,
          criado_em: a.criado_em,
          autor: (a.profiles as { nome: string } | null)?.nome ?? "—",
          envios: (a.aviso_envios ?? []).length,
          ultimoEnvio: (a.aviso_envios ?? []).map((e) => e.enviado_em).sort().at(-1) ?? null,
        }))}
      />
    </>
  );
}
