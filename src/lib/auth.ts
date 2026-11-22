import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Perfil = Database["public"]["Tables"]["profiles"]["Row"];
export type Papel = Database["public"]["Enums"]["papel_app"];

export const ROTULO_PAPEL: Record<Papel, string> = { admin: "Administrador(a)", usuario: "Leitor(a)" };

/** Usuário + perfil da requisição atual (memorizado durante a renderização). */
export const obterSessao = cache(async () => {
  const supabase = await createClient();
  // getClaims verifica a assinatura do JWT localmente (rápido); o perfil
  // (ativo/papel) vem do banco, então desativações valem na hora.
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return { user: { id }, perfil };
});

/** Exige um usuário ativo (e com a senha provisória já trocada). */
export async function requireUsuario(opcoes: { permitirTrocaPendente?: boolean } = {}): Promise<Perfil> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  const { perfil } = sessao;
  if (!perfil || !perfil.ativo) redirect("/sem-acesso");
  if (perfil.precisa_trocar_senha && !opcoes.permitirTrocaPendente) redirect("/trocar-senha");
  return perfil;
}

/** Exige o papel de administrador do sistema. */
export async function requireAdmin(): Promise<Perfil> {
  const perfil = await requireUsuario();
  if (perfil.papel !== "admin") redirect("/");
  return perfil;
}

/** Tipo padrão de retorno das server actions. */
export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { dados?: undefined } : { dados: T }))
  | { ok: false; erro: string };

export function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}
