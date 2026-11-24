import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hojeEmBelem } from "@/lib/datas";

/** Desafios, pessoas e leitura de hoje para o formulário. */
export async function dadosDoFormulario() {
  const admin = createAdminClient();
  const [{ data: grupos }, { data: perfis }, { data: dia }] = await Promise.all([
    admin.from("grupos").select("id, nome").order("criado_em", { ascending: false }),
    admin.from("profiles").select("id, nome, email, foto_path").eq("ativo", true).order("nome"),
    admin.from("plano_dias").select("leitura").eq("data", hojeEmBelem()).maybeSingle(),
  ]);
  return {
    grupos: grupos ?? [],
    pessoas: (perfis ?? []).map((p) => ({ id: p.id, nome: p.nome, email: p.email ?? "", foto: p.foto_path })),
    leituraHoje: dia?.leitura ?? "Gênesis 1 a 3",
  };
}
