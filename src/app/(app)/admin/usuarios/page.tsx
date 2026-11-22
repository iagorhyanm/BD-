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
  const [{ data: perfis }, { data: checkins }] = await Promise.all([
    admin.from("profiles").select("*").order("criado_em", { ascending: false }),
    admin.from("checkins").select("user_id"),
  ]);
  const leituras = new Map<string, number>();
  for (const c of checkins ?? []) leituras.set(c.user_id, (leituras.get(c.user_id) ?? 0) + 1);

  return (
    <>
      <CabecalhoPagina titulo="Usuários" descricao={`${perfis?.length ?? 0} contas`} voltar={{ href: "/admin", rotulo: "Administração" }} />
      <ListaUsuarios
        meuId={eu.id}
        usuarios={(perfis ?? []).map((p) => ({
          id: p.id,
          nome: p.nome,
          email: p.email ?? p.usuario ?? "",
          papel: p.papel,
          ativo: p.ativo,
          precisaTrocar: p.precisa_trocar_senha,
          criadoEm: p.criado_em,
          leituras: leituras.get(p.id) ?? 0,
        }))}
      />
    </>
  );
}
