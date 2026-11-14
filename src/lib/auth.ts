import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Perfil = Database["public"]["Tables"]["profiles"]["Row"];
export type Papel = Database["public"]["Enums"]["papel_usuario"];

/** Papéis que hoje têm acesso ao sistema. "membro" fica de fora por enquanto. */
export const PAPEIS_COM_ACESSO: Papel[] = ["edg", "coordenador"];

export const ROTULO_PAPEL: Record<Papel, string> = {
  edg: "EDG",
  coordenador: "Coordenador(a)",
  membro: "Membro",
};

/** Usuário + perfil da requisição atual (memorizado durante a renderização). */
export const obterSessao = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { user, perfil };
});

/**
 * Exige um usuário com acesso (EDG ou coordenador, ativo e com senha já trocada).
 * Use em páginas e server actions da área interna.
 */
export async function requireStaff(opcoes: { permitirTrocaPendente?: boolean } = {}): Promise<Perfil> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  const { perfil } = sessao;
  if (!perfil || !perfil.ativo || !PAPEIS_COM_ACESSO.includes(perfil.papel)) {
    redirect("/sem-acesso");
  }
  if (perfil.precisa_trocar_senha && !opcoes.permitirTrocaPendente) {
    redirect("/trocar-senha");
  }
  return perfil;
}

/** Exige o papel EDG. */
export async function requireEdg(): Promise<Perfil> {
  const perfil = await requireStaff();
  if (perfil.papel !== "edg") redirect("/");
  return perfil;
}

/** Tipo padrão de retorno das server actions. */
export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { dados?: undefined } : { dados: T }))
  | { ok: false; erro: string };

export function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}
