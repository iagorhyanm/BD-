import type { Metadata } from "next";
import { requireEdg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaCoordenadores } from "./lista-coordenadores";
import { NovoCoordenador } from "./novo-coordenador";

export const metadata: Metadata = { title: "Coordenadores" };

export default async function CoordenadoresPage() {
  const eu = await requireEdg();
  const supabase = await createClient();
  const { data: perfis } = await supabase
    .from("profiles")
    .select("*")
    .neq("papel", "membro")
    .order("ativo", { ascending: false })
    .order("nome");

  return (
    <>
      <CabecalhoPagina
        titulo="Coordenadores"
        descricao="Logins de quem usa o sistema."
        voltar={{ href: "/admin", rotulo: "Administração" }}
        acoes={<NovoCoordenador />}
      />
      <ListaCoordenadores perfis={perfis ?? []} meuId={eu.id} />
    </>
  );
}
