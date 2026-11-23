import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaUsuarios } from "./lista-usuarios";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const eu = await requireAdmin();
  // Admin vê todos (o RLS já permite); contagens via service role para incluir quem não tem grupo.
  const admin = createAdminClient();
  const [{ data: perfis }, { data: checkins }, { data: grupos }, { data: membros }] = await Promise.all([
    admin.from("profiles").select("*").order("criado_em", { ascending: false }),
    admin.from("checkins").select("user_id"),
    admin.from("grupos").select("id, nome").order("criado_em", { ascending: false }),
    admin.from("grupo_membros").select("grupo_id, user_id"),
  ]);
  const gruposDe = new Map<string, string[]>();
  for (const m of membros ?? []) gruposDe.set(m.user_id, [...(gruposDe.get(m.user_id) ?? []), m.grupo_id]);
  const leituras = new Map<string, number>();
  for (const c of checkins ?? []) leituras.set(c.user_id, (leituras.get(c.user_id) ?? 0) + 1);

  return (
    <>
      <CabecalhoPagina titulo="Usuários" descricao={`${perfis?.length ?? 0} contas`} voltar={{ href: "/admin", rotulo: "Administração" }} />
      <ListaUsuarios
        meuId={eu.id}
        grupos={grupos ?? []}
        usuarios={(perfis ?? []).map((p) => ({
          id: p.id,
          nome: p.nome,
          foto: p.foto_path,
          email: p.email ?? p.usuario ?? "",
          papel: p.papel,
          ativo: p.ativo,
          precisaTrocar: p.precisa_trocar_senha,
          criadoEm: p.criado_em,
          leituras: leituras.get(p.id) ?? 0,
          grupos: gruposDe.get(p.id) ?? [],
        }))}
      />
    </>
  );
}
